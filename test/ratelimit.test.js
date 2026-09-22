// Runs with rate limiting ENABLED (no RATE_LIMIT_DISABLED), in its own process.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestApp, stopTestApp, api, signUp, STRONG_PASSWORD } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const thread = (n) => ({
  title: `Thread number ${n} about my shoulder`,
  body: 'A reasonably long body so that it passes validation without trouble.',
  painTypes: ['aching'],
});

test('thread creation is throttled per member, and one member\'s limit does not affect another', async () => {
  const spammer = await signUp();
  const bystander = await signUp();
  const statuses = [];
  for (let i = 0; i < 7; i++) statuses.push((await api('POST', '/community/threads', { token: spammer.token, body: thread(i) })).status);
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429, 429]);
  const limited = await api('POST', '/community/threads', { token: spammer.token, body: thread(99) });
  assert.match(limited.body.message, /wait/i);
  assert.equal((await api('POST', '/community/threads', { token: bystander.token, body: thread(1) })).status, 201);
});

test('repeated failed logins are throttled', async () => {
  const u = await signUp();
  const statuses = [];
  for (let i = 0; i < 12; i++) statuses.push((await api('POST', '/auth/login', { body: { email: u.email, password: 'wrong-password-1' } })).status);
  assert.equal(statuses.filter((s) => s === 401).length, 10);
  assert.equal(statuses.filter((s) => s === 429).length, 2);
  // even the right password is refused while throttled
  assert.equal((await api('POST', '/auth/login', { body: { email: u.email, password: STRONG_PASSWORD } })).status, 429);
});

test('sign-ups from one address are throttled', async () => {
  // 3 accounts were already created by the tests above; the cap is 8 per hour.
  let created = 0;
  let limited = 0;
  for (let i = 0; i < 8; i++) {
    const r = await api('POST', '/auth/register', {
      body: { name: 'Flood', email: `flood${i}@example.com`, handle: `flood_${i}`, password: STRONG_PASSWORD, ageConfirmed: true, acceptTerms: true },
    });
    if (r.status === 201) created += 1;
    if (r.status === 429) limited += 1;
  }
  assert.equal(created, 5);
  assert.equal(limited, 3);
});
