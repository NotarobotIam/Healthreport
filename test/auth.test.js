process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { startTestApp, stopTestApp, api, signUp, STRONG_PASSWORD } = require('./helpers');

before(startTestApp);
after(stopTestApp);

const validBody = (over = {}) => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  handle: 'ada_l',
  password: STRONG_PASSWORD,
  ageConfirmed: true,
  acceptTerms: true,
  ...over,
});

test('registers, logs in, and /me never exposes the password hash', async () => {
  const reg = await api('POST', '/auth/register', { body: validBody() });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.user.handle, 'ada_l');
  assert.equal(reg.body.user.role, 'user');

  const login = await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: STRONG_PASSWORD } });
  assert.equal(login.status, 200);

  const me = await api('GET', '/auth/me', { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.password, undefined);
  assert.equal(me.body.user.tokenVersion, undefined);
  assert.equal(me.body.user.consent.ageConfirmed, true);
});

test('rejects weak, common, and self-referential passwords', async () => {
  for (const password of ['short1', 'password123', '1234567890']) {
    const r = await api('POST', '/auth/register', { body: validBody({ email: `w${password}@example.com`, handle: `w_${password}`.slice(0, 20), password }) });
    assert.equal(r.status, 400, `password ${password} should be rejected`);
  }
  const r = await api('POST', '/auth/register', { body: validBody({ email: 'grace.hopper@example.com', handle: 'grace_h', password: 'grace.hopper-2026' }) });
  assert.equal(r.status, 400);
});

test('requires age and terms consent', async () => {
  const a = await api('POST', '/auth/register', { body: validBody({ email: 'a1@example.com', handle: 'consent_a', ageConfirmed: false }) });
  assert.equal(a.status, 400);
  const b = await api('POST', '/auth/register', { body: validBody({ email: 'b1@example.com', handle: 'consent_b', acceptTerms: undefined }) });
  assert.equal(b.status, 400);
});

test('validates and reserves handles', async () => {
  for (const handle of ['ab', 'Has Space', 'admin', 'moderator', 'x'.repeat(21), 'semi;colon']) {
    const r = await api('POST', '/auth/register', { body: validBody({ email: `h${Math.random()}@example.com`, handle }) });
    assert.equal(r.status, 400, `handle "${handle}" should be rejected`);
  }
});

test('duplicate email and handle are conflicts (case-insensitive)', async () => {
  await signUp({ handle: 'dup_one', email: 'dup@example.com' });
  const sameEmail = await api('POST', '/auth/register', { body: validBody({ email: 'DUP@example.com', handle: 'dup_two' }) });
  assert.equal(sameEmail.status, 409);
  const sameHandle = await api('POST', '/auth/register', { body: validBody({ email: 'other@example.com', handle: 'DUP_ONE' }) });
  assert.equal([400, 409].includes(sameHandle.status), true);
});

test('wrong password and unknown email look identical', async () => {
  await signUp({ handle: 'known_user', email: 'known@example.com' });
  const wrong = await api('POST', '/auth/login', { body: { email: 'known@example.com', password: 'not-the-password-1' } });
  const unknown = await api('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'not-the-password-1' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test('NoSQL operator injection in login is rejected, not matched', async () => {
  await signUp({ handle: 'inj_victim', email: 'victim@example.com' });
  for (const body of [
    { email: { $ne: null }, password: STRONG_PASSWORD },
    { email: { $gt: '' }, password: { $ne: null } },
    { email: 'victim@example.com', password: { $ne: 'x' } },
  ]) {
    const r = await api('POST', '/auth/login', { body });
    assert.ok([400, 401].includes(r.status), `expected rejection, got ${r.status}`);
    assert.equal(r.body.token, undefined);
  }
});

test('protected routes reject missing, malformed, forged and alg:none tokens', async () => {
  const u = await signUp();
  assert.equal((await api('GET', '/pain')).status, 401);
  assert.equal((await api('GET', '/pain', { token: 'garbage' })).status, 401);
  const forged = jwt.sign({ id: u.id, tv: 0 }, 'a-different-secret', { algorithm: 'HS256' });
  assert.equal((await api('GET', '/pain', { token: forged })).status, 401);
  const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' +
    Buffer.from(JSON.stringify({ id: u.id, tv: 0 })).toString('base64url') + '.';
  assert.equal((await api('GET', '/pain', { token: none })).status, 401);
  assert.equal((await api('GET', '/pain', { token: u.token })).status, 200);
});

test('changing password revokes older tokens', async () => {
  const u = await signUp();
  const change = await api('PUT', '/auth/password', { token: u.token, body: { currentPassword: u.password, newPassword: 'a-brand-new-passphrase' } });
  assert.equal(change.status, 200);
  assert.equal((await api('GET', '/auth/me', { token: u.token })).status, 401, 'old token must stop working');
  assert.equal((await api('GET', '/auth/me', { token: change.body.token })).status, 200);
  const wrongCurrent = await api('PUT', '/auth/password', { token: change.body.token, body: { currentPassword: 'nope-nope-nope', newPassword: 'another-passphrase-1' } });
  assert.equal(wrongCurrent.status, 403);
});

test('a profile update cannot change username, role, email or status', async () => {
  const u = await signUp();
  const r = await api('PUT', '/users/profile', {
    token: u.token,
    body: { name: 'New Name', bio: 'hello', role: 'admin', handle: 'hijacked', email: 'x@y.com', status: 'active', tokenVersion: 99 },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.name, 'New Name');
  assert.equal(r.body.user.role, 'user');
  assert.equal(r.body.user.handle, u.handle);
  assert.equal(r.body.user.email, u.email);
});

test('logging in saves the user; the password must not be re-hashed by that save', async () => {
  const u = await signUp();
  // Each login calls user.save() (to record lastLoginAt) without changing the password.
  // If the pre-save hook re-hashed the stored hash, the second login would fail.
  for (let i = 0; i < 3; i++) {
    const login = await api('POST', '/auth/login', { body: { email: u.email, password: u.password } });
    assert.equal(login.status, 200, `login #${i + 1} must succeed`);
  }
});

test('oversized bodies get a clean 413', async () => {
  const u = await signUp();
  const huge = await api('PUT', '/users/profile', { token: u.token, body: { bio: 'x'.repeat(200_000) } });
  assert.equal(huge.status, 413);
});

test('JWT secret is not the old public fallback', () => {
  assert.notEqual(config.jwtSecret, 'demo-secret-key');
});
