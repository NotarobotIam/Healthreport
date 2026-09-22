const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, findProblems, detectCrisis } = require('../lib/contentPolicy');
const { scoreMatch, band, rankMatches, durationBucket } = require('../lib/matching');

const entry = (over = {}) => ({
  userId: 'u1',
  location: { partId: 'FJ1', system: 'muscular', side: 'right', point: [-0.1, 1.3, 0.1] },
  painTypes: ['sharp', 'burning'],
  severity: 6,
  pattern: 'constant',
  ...over,
});
const at = (point, over = {}) => entry({ location: { partId: 'FJ1', system: 'muscular', side: 'right', point }, ...over });
const elsewhere = (point, over = {}) => entry({ location: { partId: 'FJ99', system: 'muscular', side: 'left', point }, ...over });

test('content policy: contact details and links are flagged, medical numbers are not', () => {
  assert.equal(findProblems('email me at jo@example.com').length, 1);
  assert.equal(findProblems('call 555-123-4567 or +44 20 7946 0958').length, 1);
  assert.equal(findProblems('see https://example.com or www.foo.org').length, 1);
  for (const fine of [
    'My glucose was 125 mg/dL and BP 140/90 in 2026',
    'took 400mg ibuprofen at 10:30, pain 7/10 for 3 weeks',
    'HbA1c 6.9, LDL 130, since 2019-03-04',
  ]) {
    assert.deepEqual(findProblems(fine), [], fine);
  }
});

test('content policy: normalize strips invisible/control characters and tidies whitespace', () => {
  assert.equal(normalize('he​llo‮ \u0000world'), 'hello world');
  assert.equal(normalize('a\r\n\r\n\r\n\r\nb  \nc'), 'a\n\nb\nc');
});

test('crisis detection: catches clear language, ignores ordinary pain talk', () => {
  for (const t of ['I want to die', 'thinking about suicide', "I don't want to live like this", 'I keep wanting to hurt myself', 'I could kill myself']) {
    assert.equal(detectCrisis(t), true, t);
  }
  for (const t of ['this pain is killing me', 'my knee hurts when I walk', 'I died laughing', 'physical therapy is a killer workout', 'my hip aches']) {
    assert.equal(detectCrisis(t), false, t);
  }
});

test('matching: same spot + same kind of pain is very similar', () => {
  const s = scoreMatch(entry(), at([-0.1, 1.3, 0.1]));
  assert.ok(s >= 90, `score ${s}`);
  assert.equal(band(s), 'very-similar');
});

test('matching: nearby same-region pain scores lower than the same spot but is still a match', () => {
  const same = scoreMatch(entry(), at([-0.1, 1.3, 0.1]));
  const near = scoreMatch(entry(), at([-0.1, 1.38, 0.1]));
  assert.ok(near < same && near >= 40, `near ${near} same ${same}`);
});

test('matching: far away in the same system (different structure) is not a match', () => {
  const far = scoreMatch(entry(), elsewhere([0.2, 0.6, 0.0]));
  assert.equal(far, 0);
  assert.equal(band(far), null);
});

test('matching: opposite ends of the same large structure is at most a weak match', () => {
  const sameEnd = scoreMatch(entry(), at([-0.1, 1.3, 0.1]));
  const otherEnd = scoreMatch(entry(), at([-0.1, 0.8, 0.0]));
  assert.ok(otherEnd < 40, `score ${otherEnd} must not reach "similar"`);
  assert.ok(otherEnd < sameEnd);
});

test('matching: different pain type at the same spot ranks below the same type', () => {
  const alike = scoreMatch(entry(), at([-0.1, 1.3, 0.1], { painTypes: ['sharp', 'burning'] }));
  const different = scoreMatch(entry(), at([-0.1, 1.3, 0.1], { painTypes: ['numbness'] }));
  assert.ok(alike > different);
});

test('matching: rankMatches keeps each member once, best first, and drops non-matches', () => {
  const ranked = rankMatches(entry(), [
    entry({ userId: 'a' }),
    at([-0.1, 1.31, 0.1], { userId: 'a', painTypes: ['dull'] }), // worse entry from the same member
    at([-0.1, 1.36, 0.1], { userId: 'b' }),
    elsewhere([0.3, 0.2, 0], { userId: 'c' }), // nowhere near
  ]);
  assert.deepEqual(ranked.map((r) => r.userId), ['a', 'b']);
  assert.ok(ranked[0].score > ranked[1].score);
});

test('matching: duration is bucketed, never an exact date', () => {
  const now = Date.now();
  assert.equal(durationBucket(now - 3600_000, now), 'a day or two');
  assert.equal(durationBucket(now - 5 * 86400000, now), 'a few days to two weeks');
  assert.equal(durationBucket(now - 400 * 86400000, now), 'over a year');
});
