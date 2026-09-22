process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const painBody = (over = {}) => ({
  location: { partId: 'FJ1', partName: 'Right biceps brachii', system: 'muscular', side: 'right', point: [-0.2, 1.3, 0.05] },
  painTypes: ['sharp', 'burning'],
  severity: 6,
  onset: new Date(Date.now() - 3600_000).toISOString(),
  pattern: 'comes-and-goes',
  triggers: ['Movement'],
  notes: 'private note',
  ...over,
});

const reportBody = (over = {}) => ({
  testName: 'Blood Test - CBC',
  testDate: '2026-01-15',
  testType: 'Blood',
  results: { hemoglobin: '13.5 g/dL', glucose: '95 mg/dL' },
  ...over,
});

test('pain entries: default private, owner-only read/update/delete', async () => {
  const alice = await signUp();
  const bob = await signUp();

  const created = await api('POST', '/pain', { token: alice.token, body: painBody() });
  assert.equal(created.status, 201);
  assert.equal(created.body.entry.visibility, 'private');
  assert.equal(created.body.entry.userId, alice.id);
  const id = created.body.entry._id;

  assert.equal((await api('GET', '/pain', { token: bob.token })).body.count, 0);
  assert.equal((await api('PUT', `/pain/${id}`, { token: bob.token, body: { severity: 1 } })).status, 404);
  assert.equal((await api('DELETE', `/pain/${id}`, { token: bob.token })).status, 404);
  assert.equal((await api('GET', '/pain', { token: alice.token })).body.entries[0].severity, 6, 'Bob must not have changed it');
});

test('pain entries: client cannot set userId, _id or createdAt', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const r = await api('POST', '/pain', { token: alice.token, body: painBody({ userId: bob.id, _id: '000000000000000000000000', createdAt: '2001-01-01' }) });
  assert.equal(r.status, 201);
  assert.equal(r.body.entry.userId, alice.id);
  assert.notEqual(r.body.entry._id, '000000000000000000000000');
  assert.ok(new Date(r.body.entry.createdAt).getFullYear() >= 2026);
});

test('pain entries: validation and malformed ids', async () => {
  const u = await signUp();
  for (const bad of [
    painBody({ severity: 11 }),
    painBody({ severity: 5.5 }),
    painBody({ painTypes: ['bogus'] }),
    painBody({ painTypes: [] }),
    painBody({ visibility: 'public' }),
    painBody({ onset: '2999-01-01' }),
    painBody({ location: { partId: 'x', partName: 'y', system: 'z', point: [1, 2] } }),
    painBody({ notes: 'n'.repeat(2001) }),
    painBody({ triggers: { $ne: 1 } }),
  ]) {
    const r = await api('POST', '/pain', { token: u.token, body: bad });
    assert.equal(r.status, 400, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal((await api('PUT', '/pain/not-an-id', { token: u.token, body: { severity: 1 } })).status, 404);
  assert.equal((await api('DELETE', '/pain/123', { token: u.token })).status, 404);
});

test('pain entries: visibility can be changed by the owner', async () => {
  const u = await signUp();
  const { body } = await api('POST', '/pain', { token: u.token, body: painBody() });
  const r = await api('PUT', `/pain/${body.entry._id}`, { token: u.token, body: { visibility: 'community' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.entry.visibility, 'community');
});

test('reports: create, list, read; results come back as a plain object', async () => {
  const u = await signUp();
  const created = await api('POST', '/reports', { token: u.token, body: reportBody() });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.report.results, { hemoglobin: '13.5 g/dL', glucose: '95 mg/dL' });
  const list = await api('GET', '/reports', { token: u.token });
  assert.equal(list.body.count, 1);
  assert.equal((await api('GET', `/reports/${created.body.report._id}`, { token: u.token })).status, 200);
});

test('reports: other members get 404 for read, update and delete', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const { body } = await api('POST', '/reports', { token: alice.token, body: reportBody() });
  const id = body.report._id;
  assert.equal((await api('GET', `/reports/${id}`, { token: bob.token })).status, 404);
  assert.equal((await api('PUT', `/reports/${id}`, { token: bob.token, body: { testName: 'hacked' } })).status, 404);
  assert.equal((await api('DELETE', `/reports/${id}`, { token: bob.token })).status, 404);
  assert.equal((await api('GET', `/reports/${id}`, { token: alice.token })).body.report.testName, 'Blood Test - CBC');
});

test('reports: an update cannot reassign the report to another member (the old mass-assignment hole)', async () => {
  const alice = await signUp();
  const bob = await signUp();
  const { body } = await api('POST', '/reports', { token: alice.token, body: reportBody() });
  const id = body.report._id;
  const r = await api('PUT', `/reports/${id}`, { token: alice.token, body: { testName: 'Renamed', userId: bob.id } });
  assert.equal(r.status, 200);
  assert.equal(r.body.report.testName, 'Renamed');
  assert.equal(r.body.report.userId, alice.id, 'owner must not change');
  assert.equal((await api('GET', `/reports/${id}`, { token: bob.token })).status, 404);
});

test('reports: validation', async () => {
  const u = await signUp();
  for (const bad of [
    reportBody({ testType: 'Astrology' }),
    reportBody({ testName: '' }),
    reportBody({ results: 'nope' }),
    reportBody({ results: ['a'] }),
    reportBody({ results: { '$where': '1' } }),
    reportBody({ testDate: 'not a date' }),
    reportBody({ normal: 'yes' }),
  ]) {
    assert.equal((await api('POST', '/reports', { token: u.token, body: bad })).status, 400, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal((await api('GET', '/reports?testType=Astrology', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/reports?testType[$ne]=Blood', { token: u.token })).status, 400);
});

test('reports: transposed data is keyed by the same ISO dates listed in testDates', async () => {
  const u = await signUp();
  await api('POST', '/reports', { token: u.token, body: reportBody({ testDate: '2026-01-15', results: { glucose: '95 mg/dL', nested: { a: 1 } } }) });
  await api('POST', '/reports', { token: u.token, body: reportBody({ testDate: '2026-03-15', results: { glucose: '99 mg/dL', ldl: '110 mg/dL' } }) });
  const r = await api('POST', '/reports/transpose/data?testType=Blood', { token: u.token });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.testDates, ['2026-01-15T00:00:00.000Z', '2026-03-15T00:00:00.000Z']);
  // The client does data.transposed[metric][date] for each date in testDates; every one must resolve.
  assert.equal(r.body.transposed.glucose[r.body.testDates[0]], '95 mg/dL');
  assert.equal(r.body.transposed.glucose[r.body.testDates[1]], '99 mg/dL');
  assert.equal(r.body.transposed.ldl[r.body.testDates[1]], '110 mg/dL');
  assert.equal(r.body.transposed.ldl[r.body.testDates[0]], undefined);
  assert.ok(Object.keys(r.body.transposed.glucose).every((k) => r.body.testDates.includes(k)), 'no key may be a non-ISO string');
  assert.equal(r.body.transposed.nested, undefined, 'nested blobs are skipped');
});

test('reports: transpose for a member with no reports returns empty arrays, not a missing field', async () => {
  const u = await signUp();
  const r = await api('POST', '/reports/transpose/data?testType=Blood', { token: u.token });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.testDates, []);
  assert.deepEqual(r.body.transposed, {});
});
