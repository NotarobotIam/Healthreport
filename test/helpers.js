// Shared test harness: boots the real app on an ephemeral port against a
// throwaway database, and offers small helpers for signing up members.
process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const mongoose = require('mongoose');
const { createApp } = require('../app');

const BASE_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017';

let server;
let baseUrl;
let dbName;

async function startTestApp() {
  dbName = `hr-test-${crypto.randomBytes(5).toString('hex')}`;
  await mongoose.connect(`${BASE_URI}/${dbName}`, { serverSelectionTimeoutMS: 5000 });
  // createApp() loads every route, and therefore every model. Only then can we wait for all
  // their indexes (unique constraints, the text-search index) to exist before the first request.
  const app = createApp();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  return baseUrl;
}

async function stopTestApp() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Minimal JSON client. Returns { status, body }. */
async function api(method, path, { token, body, headers } = {}) {
  const res = await fetch(baseUrl + '/api' + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

let counter = 0;
const STRONG_PASSWORD = 'correct-horse-battery';

/** Registers a member through the real endpoint and returns { token, id, handle, email }. */
async function signUp(overrides = {}) {
  counter += 1;
  const handle = overrides.handle || `member_${counter}_${crypto.randomBytes(2).toString('hex')}`;
  const email = overrides.email || `${handle}@example.com`;
  const res = await api('POST', '/auth/register', {
    body: {
      name: `Test Person ${counter}`,
      email,
      handle,
      password: STRONG_PASSWORD,
      ageConfirmed: true,
      acceptTerms: true,
      ...overrides.extra,
    },
  });
  if (res.status !== 201) throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token, id: res.body.user.id, handle, email, password: STRONG_PASSWORD };
}

/** Promotes a member directly in the database (there is deliberately no API for this). */
async function setRole(userId, role) {
  await mongoose.model('User').updateOne({ _id: userId }, { $set: { role } });
}

module.exports = { startTestApp, stopTestApp, api, signUp, setRole, STRONG_PASSWORD };
