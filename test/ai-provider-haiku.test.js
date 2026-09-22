// The DEFAULT (cheap) model, through the real SDK, pointed at a local fake server.
// Haiku 4.5 does not take an effort setting or the server-side refusal fallback, so the request must not include them.
const http = require('node:http');
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

let server;
let requests;
let handler;

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const rec = { url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
      requests.push(rec);
      const { status = 200, json } = handler(rec, requests.length);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(json));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  delete process.env.AI_MODEL; // use the default
  delete process.env.AI_MOCK;
});
after(() => new Promise((r) => server.close(r)));

const answer = () => ({
  summary: 'A summary.', patterns: ['p'],
  possibilities: [{ name: 'A strain', why_it_might_fit: 'Fits movement-related pain.', urgency: 'routine' }],
  tests_to_ask_about: [], questions_for_doctor: ['What could it be?'], red_flags: [], insufficient_data: false,
});
const message = (over = {}) => ({
  id: 'msg', type: 'message', role: 'assistant', model: 'claude-haiku-4-5', content: [{ type: 'text', text: JSON.stringify(answer()) }],
  stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1234, output_tokens: 321 }, ...over,
});

beforeEach(() => {
  requests = [];
  handler = () => ({ json: message() });
});

const call = (over = {}) => require('../lib/ai/provider').getProvider().generate({ kind: 'question', system: 'SYSTEM', user: 'USER', ...over });

test('the default model is Haiku 4.5, the cheap one', () => {
  assert.equal(require('../config').aiModel, 'claude-haiku-4-5');
});

test('the request is shaped for Haiku: small output cap, structured output, and none of the Opus-only options', async () => {
  const out = await call({ maxTokens: 1200 });
  const b = requests[0].body;
  assert.equal(b.model, 'claude-haiku-4-5');
  assert.equal(b.max_tokens, 1200, 'a small output cap is what keeps each answer cheap');
  assert.ok(b.max_tokens <= 2000);
  assert.equal(b.output_config.format.type, 'json_schema');
  assert.ok(!('effort' in (b.output_config || {})), 'Haiku 4.5 rejects the effort setting');
  assert.ok(!('fallbacks' in b), 'no server-side fallback on this model');
  assert.ok(!(requests[0].headers['anthropic-beta'] || '').includes('server-side-fallback'), 'no fallback beta header');
  assert.ok(!('thinking' in b) && !('temperature' in b) && !('tools' in b));
  assert.deepEqual(b.messages, [{ role: 'user', content: 'USER' }]);
  assert.deepEqual(out.usage, { inputTokens: 1234, outputTokens: 321 }, 'token usage is reported for cost tracking');
  assert.equal(out.raw.possibilities[0].name, 'A strain');
});

test('if the model rejects structured output, it falls back to plain JSON and still works', async () => {
  handler = (rec, n) => (n === 1 ? { status: 400, json: { type: 'error', error: { type: 'invalid_request_error', message: 'output_config.format is not supported for this model' } } } : { json: message({ content: [{ type: 'text', text: `Here you go:\n${JSON.stringify(answer())}` }] }) });
  const out = await call();
  assert.equal(requests.length, 2);
  assert.ok(!('output_config' in requests[1].body), 'the retry does not use structured output');
  assert.match(requests[1].body.system, /Reply with a single JSON object only/);
  assert.equal(out.raw.summary, 'A summary.');
  assert.equal(out.usage.outputTokens, 321);
});

test('a plain-text reply that is not valid JSON is a failure, not a half-answer', async () => {
  handler = (rec, n) => (n === 1 ? { status: 400, json: { type: 'error', error: { type: 'invalid_request_error', message: 'nope' } } } : { json: message({ content: [{ type: 'text', text: 'I cannot answer that.' }] }) });
  const { AiFailedError } = require('../lib/ai/provider');
  await assert.rejects(call, (e) => e instanceof AiFailedError);
});

test('a refusal is reported calmly, and provider error details never leak', async () => {
  const { AiRefusedError, AiBusyError } = require('../lib/ai/provider');
  handler = () => ({ json: message({ content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: 'internal' } }) });
  await assert.rejects(call, (e) => e instanceof AiRefusedError && !/internal/.test(e.message));
  handler = () => ({ status: 429, json: { type: 'error', error: { type: 'rate_limit_error', message: 'key sk-ant-SECRET limited' } } });
  await assert.rejects(call, (e) => e instanceof AiBusyError && !/SECRET/.test(e.message));
});
