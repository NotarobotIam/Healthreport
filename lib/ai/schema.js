const { z } = require('zod');
const { cleanText } = require('../plainText');

// The shape we ask the model for. Lengths and counts are deliberately NOT expressed here: structured
// outputs guarantee the *shape*, and everything about size and content is enforced by sanitizeResult().
const InsightSchema = z.object({
  summary: z.string(),
  patterns: z.array(z.string()),
  possibilities: z.array(
    z.object({
      name: z.string(),
      why_it_might_fit: z.string(),
      urgency: z.enum(['routine', 'soon', 'urgent']),
    }),
  ),
  tests_to_ask_about: z.array(z.string()),
  questions_for_doctor: z.array(z.string()),
  red_flags: z.array(z.string()),
  insufficient_data: z.boolean(),
});

// Text we never show, whatever the model said: doses, treatment instructions, and certainty.
const DOSAGE = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ug|g|ml|iu|units?|tablets?|pills?|capsules?)\b/i;
const INSTRUCTION = /\b(?:you should (?:take|start|stop|increase|decrease)|start taking|stop taking|take (?:an?|some|your)\b|increase your dose|decrease your dose|prescrib(?:e|ed|ing))\b/i;
const CERTAINTY = /\b(?:you (?:definitely|certainly|clearly) have|you are suffering from|this is definitely|is definitely caused|you have been diagnosed with|diagnosis is)\b/i;

const isUnsafe = (s) => DOSAGE.test(s) || INSTRUCTION.test(s) || CERTAINTY.test(s);

const list = (value, max, len) =>
  (Array.isArray(value) ? value : [])
    .map((v) => cleanText(typeof v === 'string' ? v : '', len))
    .filter((v) => v && !isUnsafe(v))
    .slice(0, max);

const URGENCIES = ['routine', 'soon', 'urgent'];

/**
 * Turns whatever came back into something safe to store and show: plain text, bounded sizes, at most
 * `maxPossibilities` possibilities, and anything that reads like a dose, a treatment instruction, or
 * a definite diagnosis removed. Returns { result, removed } where `removed` counts what was dropped.
 */
function sanitizeResult(raw, { maxPossibilities = 3 } = {}) {
  const r = raw && typeof raw === 'object' ? raw : {};
  let removed = 0;
  const kept = (s, len) => {
    const c = cleanText(typeof s === 'string' ? s : '', len);
    if (c && isUnsafe(c)) {
      removed += 1;
      return '';
    }
    return c;
  };

  const possibilities = (Array.isArray(r.possibilities) ? r.possibilities : [])
    .map((p) => ({
      name: kept(p && p.name, 90),
      why: kept(p && p.why_it_might_fit, 400),
      urgency: URGENCIES.includes(p && p.urgency) ? p.urgency : 'routine',
    }))
    .filter((p) => p.name && p.why)
    .slice(0, Math.max(0, Math.min(3, maxPossibilities)));

  const before = (Array.isArray(r.patterns) ? r.patterns.length : 0) + (Array.isArray(r.tests_to_ask_about) ? r.tests_to_ask_about.length : 0) + (Array.isArray(r.questions_for_doctor) ? r.questions_for_doctor.length : 0) + (Array.isArray(r.red_flags) ? r.red_flags.length : 0);
  const result = {
    summary: kept(r.summary, 800),
    patterns: list(r.patterns, 5, 240),
    possibilities,
    testsToAskAbout: list(r.tests_to_ask_about, 5, 200),
    questionsForDoctor: list(r.questions_for_doctor, 7, 220),
    redFlags: list(r.red_flags, 5, 260),
    insufficientData: r.insufficient_data === true,
  };
  removed += before - (result.patterns.length + result.testsToAskAbout.length + result.questionsForDoctor.length + result.redFlags.length);
  if (!result.summary) result.summary = 'Here is what stands out in your records, to help you prepare for a conversation with your clinician.';
  return { result, removed: Math.max(0, removed) };
}

module.exports = { InsightSchema, sanitizeResult, isUnsafe };
