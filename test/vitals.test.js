process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const reading = (over = {}) => ({ measuredAt: new Date(Date.now() - 3600_000).toISOString(), systolic: 118, diastolic: 76, heartRate: 64, spo2: 98, ...over });

test('vitals require sign-in, and each member only sees their own', async () => {
  assert.equal((await api('GET', '/vitals')).status, 401);
  const a = await signUp();
  const b = await signUp();
  const made = await api('POST', '/vitals', { token: a.token, body: reading() });
  assert.equal(made.status, 201);
  assert.equal(made.body.vital.userId, a.id);
  assert.equal((await api('GET', '/vitals', { token: b.token })).body.count, 0);
  const id = made.body.vital._id;
  assert.equal((await api('PUT', `/vitals/${id}`, { token: b.token, body: { heartRate: 70 } })).status, 404);
  assert.equal((await api('DELETE', `/vitals/${id}`, { token: b.token })).status, 404);
  assert.equal((await api('GET', '/vitals', { token: a.token })).body.vitals[0].heartRate, 64, "Bob's attempts changed nothing");
});

test('implausible numbers are refused rather than silently charted', async () => {
  const u = await signUp();
  for (const bad of [
    reading({ heartRate: 1200 }),
    reading({ heartRate: -5 }),
    reading({ spo2: 101 }),
    reading({ temperatureC: 98.6 }), // Fahrenheit typed into a Celsius field
    reading({ weightKg: 5 }),
    reading({ heartRate: '64' }),
    reading({ heartRate: { $gt: 0 } }),
    reading({ systolic: 60, diastolic: 90 }), // top number lower than the bottom one
    { measuredAt: new Date().toISOString() }, // nothing measured
    reading({ measuredAt: '2999-01-01' }),
    reading({ note: 'n'.repeat(201) }),
  ]) {
    assert.equal((await api('POST', '/vitals', { token: u.token, body: bad })).status, 400, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal((await api('POST', '/vitals', { token: u.token, body: { systolic: 120, heartRate: 60 } })).status, 400, 'a lone systolic value is incomplete');
});

test('a reading may have just one measurement, and unknown fields are ignored', async () => {
  const a = await signUp();
  const b = await signUp();
  const r = await api('POST', '/vitals', { token: a.token, body: { weightKg: 71.234, userId: b.id, _id: '000000000000000000000000', role: 'admin' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.vital.weightKg, 71.2, 'rounded to one decimal');
  assert.equal(r.body.vital.userId, a.id);
  assert.notEqual(r.body.vital._id, '000000000000000000000000');
  assert.ok(r.body.vital.measuredAt, 'defaults to now');
});

test('list is newest first and can be limited to recent days', async () => {
  const u = await signUp();
  for (const daysAgo of [40, 10, 2]) await api('POST', '/vitals', { token: u.token, body: reading({ measuredAt: new Date(Date.now() - daysAgo * 86400000).toISOString(), heartRate: 50 + daysAgo }) });
  const all = await api('GET', '/vitals', { token: u.token });
  assert.deepEqual(all.body.vitals.map((v) => v.heartRate), [52, 60, 90]);
  assert.equal((await api('GET', '/vitals?days=14', { token: u.token })).body.count, 2);
  assert.equal((await api('GET', '/vitals?days=0', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/vitals?days[$gt]=1', { token: u.token })).status, 400);
});

test('update and delete', async () => {
  const u = await signUp();
  const { body } = await api('POST', '/vitals', { token: u.token, body: reading() });
  const id = body.vital._id;
  const upd = await api('PUT', `/vitals/${id}`, { token: u.token, body: { heartRate: 72, note: 'after a walk' } });
  assert.equal(upd.body.vital.heartRate, 72);
  assert.equal(upd.body.vital.systolic, 118, 'unchanged fields stay');
  assert.equal((await api('PUT', `/vitals/${id}`, { token: u.token, body: { heartRate: 9999 } })).status, 400);
  assert.equal((await api('PUT', '/vitals/not-an-id', { token: u.token, body: {} })).status, 404);
  assert.equal((await api('DELETE', `/vitals/${id}`, { token: u.token })).status, 200);
  assert.equal((await api('DELETE', `/vitals/${id}`, { token: u.token })).status, 404);
});

test('exam report types "Cardiac" and "Physical Exam" are accepted; unknown types still are not', async () => {
  const u = await signUp();
  const ok = (testType) => api('POST', '/reports', { token: u.token, body: { testName: 'Exam', testDate: '2026-03-01', testType, results: { examKind: 'ecg', heartRate: '62' } } });
  assert.equal((await ok('Cardiac')).status, 201);
  assert.equal((await ok('Physical Exam')).status, 201);
  assert.equal((await ok('Astrology')).status, 400);
  assert.equal((await api('GET', '/reports?testType=Cardiac', { token: u.token })).body.count, 1);
});

test('gut microbiome results are stored as "Microbiome" reports, are private, and can be filtered', async () => {
  const u = await signUp();
  const other = await signUp();
  const post = (token, results) => api('POST', '/reports', { token, body: { testName: 'Gut microbiome sequencing (stool)', testDate: '2026-04-01', testType: 'Microbiome', results } });
  assert.equal((await post(u.token, { examKind: 'sequencing', shannonDiversity: 3.1, firmicutesPct: 52 })).status, 201);
  assert.equal((await post(u.token, { examKind: 'calprotectin', calprotectin: 38 })).status, 201);
  assert.equal((await api('POST', '/reports', { token: u.token, body: { testName: 'CBC', testDate: '2026-04-01', testType: 'Blood', results: { glucose: '90' } } })).status, 201);
  const mine = await api('GET', '/reports?testType=Microbiome', { token: u.token });
  assert.equal(mine.body.count, 2);
  assert.ok(mine.body.reports.every((r) => r.testType === 'Microbiome'));
  assert.equal((await api('GET', '/reports?testType=Microbiome', { token: other.token })).body.count, 0, 'other members never see them');
  assert.equal((await api('GET', '/reports?testType=Stool', { token: u.token })).status, 400);
  // The Data page's per-marker view picks up the numeric markers.
  const t = await api('POST', '/reports/transpose/data?testType=Microbiome', { token: u.token });
  assert.equal(t.status, 200);
  assert.ok('calprotectin' in t.body.transposed && 'shannonDiversity' in t.body.transposed);
});

test('the gut microbiome community exists in the digestive category', async () => {
  const u = await signUp();
  const res = await api('GET', '/groups', { token: u.token });
  const digestive = res.body.categories.find((c) => c.slug === 'digestive');
  assert.ok(digestive.groups.some((g) => g.slug === 'gut-microbiome'));
});
