// The REAL Anthropic SDK code path, pointed at a local fake server, so we can inspect the exact request
// our code sends and how it reacts to each kind of reply. (No network, no key, no cost.)
const http = require('node:http');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

let server;
let received;
let reply;

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
      const { status = 200, json } = reply();
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(json));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  // Must be set before the SDK and config modules are loaded.
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.AI_MODEL = 'claude-opus-5'; // this file checks the strong-model request; see ai-provider-haiku.test.js for the default
  delete process.env.AI_MOCK;
});
after(() => new Promise((r) => server.close(r)));

const insight = () => ({
  summary: 'A summary.',
  patterns: ['One pattern'],
  possibilities: [{ name: 'A muscle strain', why_it_might_fit: 'It fits movement-related pain.', urgency: 'routine' }],
  tests_to_ask_about: [],
  questions_for_doctor: ['What could it be?'],
  red_flags: [],
  insufficient_data: false,
});
const message = (over = {}) => ({
  id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5',
  content: [{ type: 'text', text: JSON.stringify(insight()) }],
  stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 10 }, ...over,
});

beforeEach(() => {
  received = null;
  reply = () => ({ json: message() });
});

const load = () => require('../lib/ai/provider');
const call = () => load().getProvider().generate({ kind: 'pain', system: 'SYSTEM PROMPT', user: 'USER MESSAGE', data: {} });

test('with a key configured, Claude is the provider (and it is not labelled a demo)', () => {
  const p = load().getProvider();
  assert.equal(p.name, 'anthropic');
  assert.equal(p.demo, false);
  assert.equal(load().isAvailable(), true);
});

test('the request: Opus 5, structured JSON output, refusal fallback, and the prompts we built', async () => {
  const out = await call();
  assert.equal(received.method, 'POST');
  assert.match(received.url, /\/v1\/messages/);
  assert.equal(received.headers['x-api-key'], 'test-key-not-real');
  assert.match(received.headers['anthropic-beta'], /server-side-fallback-2026-07-01/);

  const b = received.body;
  assert.equal(b.model, 'claude-opus-5');
  assert.equal(b.fallbacks, 'default', 'a safety decline is re-run on the recommended fallback, not shown as a failure');
  assert.equal(b.system, 'SYSTEM PROMPT');
  assert.deepEqual(b.messages, [{ role: 'user', content: 'USER MESSAGE' }]);
  assert.ok(b.max_tokens >= 8000);
  assert.equal(b.output_config.effort, 'medium');
  assert.equal(b.output_config.format.type, 'json_schema');
  const props = Object.keys(b.output_config.format.schema.properties).sort();
  assert.deepEqual(props, ['insufficient_data', 'patterns', 'possibilities', 'questions_for_doctor', 'red_flags', 'summary', 'tests_to_ask_about']);
  assert.ok(!('temperature' in b) && !('top_p' in b) && !('top_k' in b) && !JSON.stringify(b).includes('budget_tokens'), 'no parameters that Opus 5 rejects');
  assert.ok(!('tools' in b) && !('tool_choice' in b), 'no forced tool use');
  assert.ok(!b.messages.some((m) => m.role === 'assistant'), 'no assistant prefill');

  assert.equal(out.model, 'claude-opus-5');
  assert.equal(out.raw.possibilities[0].name, 'A muscle strain');
});

test('nothing but our own text is sent: no member identifiers appear in the request', async () => {
  await call();
  assert.ok(!JSON.stringify(received.body).match(/@|handle|password/i));
});

test('a refusal from the model becomes a calm "declined" error', async () => {
  reply = () => ({ json: message({ content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: 'internal detail' } }) });
  await assert.rejects(call, (e) => e instanceof load().AiRefusedError && !/internal detail/.test(e.message));
});

test('an unparsable reply is a failure, not a crash or a half-result', async () => {
  reply = () => ({ json: message({ content: [{ type: 'text', text: 'Sorry, I cannot format that as JSON.' }] }) });
  await assert.rejects(call, (e) => e instanceof load().AiFailedError);
});

test('provider errors map to busy / unavailable / failed without leaking details', async () => {
  const err = (status, type, msg) => () => ({ status, json: { type: 'error', error: { type, message: msg } } });
  reply = err(429, 'rate_limit_error', 'org key sk-ant-SECRET is rate limited');
  await assert.rejects(call, (e) => e instanceof load().AiBusyError && !/SECRET/.test(e.message));
  reply = err(500, 'api_error', 'internal stack trace');
  await assert.rejects(call, (e) => e instanceof load().AiFailedError && !/stack trace/.test(e.message));
  reply = err(401, 'authentication_error', 'invalid x-api-key');
  await assert.rejects(call, (e) => e instanceof load().AiFailedError && !/x-api-key/.test(e.message));
});
