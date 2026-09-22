const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const config = require('../../config');
const { InsightSchema } = require('./schema');

class AiUnavailableError extends Error {}
class AiRefusedError extends Error {}
class AiFailedError extends Error {}
class AiBusyError extends Error {}

// ----------------------------------------------------------------------------------- Claude

// Opus 5 and Fable take an effort setting and the server-side refusal fallback. Haiku 4.5 does not
// (it would reject them), so the request is built to suit the configured model.
const isModernModel = (model) => /^claude-(opus-5|fable)/.test(model);

/** Pulls the first JSON object out of a text reply and checks it against the schema. Returns null if it isn't one. */
function parseJsonReply(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = InsightSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function anthropicProvider() {
  // Two retries for transient errors; a minute is plenty for one structured answer.
  const client = new Anthropic({ apiKey: config.anthropicApiKey, timeout: 60_000, maxRetries: 2 });
  const model = config.aiModel;
  const modern = isModernModel(model);

  return {
    name: 'anthropic',
    demo: false,
    async generate({ system, user, maxTokens = 1500 }) {
      const base = { model, max_tokens: modern ? 16000 : maxTokens, system, messages: [{ role: 'user', content: user }] };
      const usageOf = (u) => ({ inputTokens: (u && u.input_tokens) || 0, outputTokens: (u && u.output_tokens) || 0 });
      let res;
      try {
        if (modern) {
          // If a safety classifier declines the request, the API re-runs it on Anthropic's recommended
          // fallback model instead of returning a refusal.
          res = await client.beta.messages.parse({
            ...base,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'medium', format: zodOutputFormat(InsightSchema) },
          });
        } else {
          try {
            res = await client.messages.parse({ ...base, output_config: { format: zodOutputFormat(InsightSchema) } });
          } catch (err) {
            // If this model rejects structured outputs, ask for JSON in plain text and check it ourselves.
            if (!(err instanceof Anthropic.BadRequestError)) throw err;
            const plain = await client.messages.create({ ...base, system: `${system}\n\nReply with a single JSON object only, matching the fields described. No other text.` });
            const text = plain.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
            const raw = parseJsonReply(text);
            if (plain.stop_reason === 'refusal') throw new AiRefusedError('refused');
            if (!raw) throw new AiFailedError('unparsable');
            return { raw, model: plain.model, usage: usageOf(plain.usage) };
          }
        }
      } catch (err) {
        if (err instanceof AiRefusedError || err instanceof AiFailedError) throw err;
        // Provider error details are logged for the operator and never passed on to the member.
        console.error('AI request failed:', err && err.status ? `${err.status} ${err.name}` : err && err.name);
        if (err instanceof Anthropic.RateLimitError) throw new AiBusyError('busy');
        if (err instanceof Anthropic.APIConnectionError) throw new AiUnavailableError('connection');
        throw new AiFailedError('request');
      }
      if (res.stop_reason === 'refusal') throw new AiRefusedError('refused');
      if (!res.parsed_output) throw new AiFailedError('unparsable');
      return { raw: res.parsed_output, model: res.model, usage: usageOf(res.usage) };
    },
  };
}

// ------------------------------------------------------------------------------------ demo

/**
 * Development only (AI_MOCK=1). Produces a plausible-looking result from the records so the whole flow
 * can be tried without an account. It is NOT an analysis, and everything it returns is labelled as a demo.
 */
function mockProvider() {
  return {
    name: 'mock',
    demo: true,
    async generate({ kind, data, question }) {
      if (kind === 'question') {
        return {
          model: 'demo',
          usage: { inputTokens: 0, outputTokens: 0 },
          raw: {
            summary: 'DEMO — not a real answer. In real use, this explains in plain language what kinds of things could account for what you described, and what a clinician would look at to tell them apart.',
            patterns: [`You asked: "${String(question || '').slice(0, 120)}"`],
            possibilities: [
              { name: 'A superficial (skin or surface-tissue) cause', why_it_might_fit: 'Demonstration text. Tenderness that depends on the kind of touch can be consistent with surface tissues rather than deeper ones.', urgency: 'soon' },
              { name: 'Something deeper that only an examination can separate', why_it_might_fit: 'Demonstration text. Only a hands-on examination can tell these apart.', urgency: 'soon' },
            ],
            tests_to_ask_about: ['Whether an examination and imaging would help'],
            questions_for_doctor: ['Could the kind of touch that hurts point to a cause?', 'What examination should I have?'],
            red_flags: ['Any new lump, skin change, discharge or bleeding should be checked promptly.'],
            insufficient_data: false,
          },
        };
      }
      if (kind === 'pain') {
        const rows = data.rows;
        const areas = [...new Set(rows.map((r) => r.area))];
        const types = [...new Set(rows.flatMap((r) => r.feelsLike))];
        const systems = [...new Set(rows.map((r) => r.bodySystem))];
        const blurb = { muscular: 'a muscle or tendon strain', skeletal: 'irritation of a joint or bone', digestive: 'a digestive-system cause', nervous: 'irritation of a nerve', respiratory: 'a breathing-related cause', cardiac: 'a heart-related cause worth ruling out' };
        return {
          model: 'demo',
          usage: { inputTokens: 0, outputTokens: 0 },
          raw: {
            summary: `DEMO — not a real analysis. You have logged ${data.total} entries, mostly around ${areas.slice(0, 2).join(' and ') || 'one area'}, described as ${types.slice(0, 3).join(', ') || 'painful'}.`,
            patterns: [`Most entries are in the ${systems[0] || 'same'} system.`, `Typical severity is around ${Math.round(rows.reduce((n, r) => n + r.severityOutOf10, 0) / (rows.length || 1))} out of 10.`],
            possibilities: systems.slice(0, 3).map((s, i) => ({ name: `Possibly ${blurb[s] || 'a pattern that needs an examination'}`, why_it_might_fit: 'This is a demonstration message. In real use, this explains why the pattern in your records could be consistent with it.', urgency: i === 0 ? 'routine' : 'soon' })),
            tests_to_ask_about: ['Whether an examination or imaging of the painful area would help'],
            questions_for_doctor: ['What could be causing this pattern?', 'Which of my triggers should I keep track of?', 'What warning signs mean I should come back sooner?'],
            red_flags: ['Pain that suddenly gets much worse, or comes with fever, weakness, or numbness.'],
            insufficient_data: false,
          },
        };
      }
      const latest = data.readings[0] || {};
      return {
        model: 'demo',
        usage: { inputTokens: 0, outputTokens: 0 },
        raw: {
          summary: `DEMO — not a real analysis. You have ${data.readings.length} readings and ${data.exams.length} exam results on file.`,
          patterns: [latest.systolic ? `Your latest blood pressure was ${latest.systolic}/${latest.diastolic}.` : 'No blood pressure yet.'],
          possibilities: [{ name: 'Blood pressure or heart rate drifting outside the typical range', why_it_might_fit: 'This is a demonstration message. In real use, it explains which values or trends stand out.', urgency: 'routine' }],
          tests_to_ask_about: ['Whether a resting ECG or a lipid panel is due'],
          questions_for_doctor: ['Are my readings where they should be for me?', 'How often should I measure at home?'],
          red_flags: [],
          insufficient_data: false,
        },
      };
    },
  };
}

const unavailableProvider = { name: 'none', demo: false, available: false };

let override = null;
/** Test hook: use this provider instead of the configured one. */
const _setProvider = (p) => {
  override = p;
};

let cached;
function getProvider() {
  if (override) return override;
  if (!cached) {
    if (config.anthropicApiKey) cached = anthropicProvider();
    else if (config.aiMock) cached = mockProvider();
    else cached = unavailableProvider;
  }
  return cached;
}

const isAvailable = () => getProvider().name !== 'none';

module.exports = { getProvider, isAvailable, _setProvider, AiUnavailableError, AiRefusedError, AiFailedError, AiBusyError };
