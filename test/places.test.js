// OpenStreetMap is replaced by a fake: no test here touches the network.
process.env.RATE_LIMIT_DISABLED = '1';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const places = require('../lib/places');
const { startTestApp, stopTestApp, api, signUp } = require('./helpers');

before(async () => {
  places._setPace(0);
  await startTestApp();
});
after(stopTestApp);

let calls; // { url, body }
let overpass; // 'ok' | 'busy' | 'html' | 'evil'
let nominatim; // 'ok' | 'down'

const OVERPASS_OK = {
  elements: [
    { type: 'way', id: 1001, center: { lat: 41.9, lon: -87.65 }, tags: { name: 'Far Hospital', amenity: 'hospital', phone: '+1 312 555 0100; +1 312 555 0101', website: 'farhospital.example.org', emergency: 'yes', 'addr:housenumber': '5', 'addr:street': 'Main St', 'addr:city': 'Chicago' } },
    { type: 'node', id: 1002, lat: 41.881, lon: -87.631, tags: { name: 'Near Hospital', amenity: 'hospital' } },
    { type: 'node', id: 1003, lat: 41.88, lon: -87.63, tags: { amenity: 'hospital' } }, // no name: dropped
  ],
};
const OVERPASS_EVIL = {
  elements: [
    { type: 'node', id: 2001, lat: 41.881, lon: -87.631, tags: { name: '<img src=x onerror=alert(1)>Good &amp; Hospital', website: 'javascript:alert(1)', phone: '<script>' } },
    { type: 'node', id: 2002, lat: 41.882, lon: -87.632, tags: { name: 'Data Hospital', website: 'data:text/html,<script>alert(1)</script>' } },
    { type: 'node', id: 'x/../y', lat: 41.883, lon: -87.633, tags: { name: 'Bad Id Hospital' } },
    { type: 'node', id: 2004, lat: 'north', lon: -87.633, tags: { name: 'No Position Hospital' } },
  ],
};
const NOMINATIM_ROWS = [
  { osm_type: 'way', osm_id: 3001, type: 'hospital', name: 'Nominatim Hospital', lat: '41.885', lon: '-87.62', extratags: { phone: '+1 312 555 0199', website: 'https://nh.example.org' }, address: { house_number: '9', road: 'Oak Ave', city: 'Chicago' } },
  { osm_type: 'node', osm_id: 3002, type: 'pharmacy', name: 'Not A Hospital', lat: '41.886', lon: '-87.62' },
];

places._setFetch(async (url, init = {}) => {
  const u = String(url);
  calls.push({ url: u, body: init.body ? decodeURIComponent(String(init.body)) : '' });
  if (u.includes('nominatim')) {
    if (nominatim === 'down') throw new Error('network down');
    const q = new URL(u).searchParams.get('q');
    const rows = q === 'Denver' ? [{ display_name: 'Denver, Colorado, United States', lat: '39.7392364', lon: '-104.984862' }, { display_name: '<b>Junk</b>', lat: 'nope', lon: '1' }] : NOMINATIM_ROWS;
    return { ok: true, status: 200, json: async () => rows };
  }
  if (overpass === 'busy') return { ok: false, status: 504, json: async () => { throw new Error('not json'); } };
  if (overpass === 'html') return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } };
  return { ok: true, status: 200, json: async () => (overpass === 'evil' ? OVERPASS_EVIL : OVERPASS_OK) };
});

let lonBase = 0;
/** A different area for each test so cached answers never leak between them. */
const area = () => { lonBase += 1; return { lat: '41.88', lon: `-${80 + lonBase}.00` }; };
const near = (u, { lat, lon }, extra = '') => api('GET', `/places/nearby?lat=${lat}&lon=${lon}${extra}`, { token: u.token });

beforeEach(() => {
  calls = [];
  overpass = 'ok';
  nominatim = 'ok';
  places._clearCache();
});

test('places requires sign-in and validates every parameter before any outbound call', async () => {
  const u = await signUp();
  assert.equal((await api('GET', '/places/nearby?lat=41&lon=-87')).status, 401);
  for (const q of ['', 'lat=41', 'lat=abc&lon=1', 'lat=91&lon=0', 'lat=0&lon=181', 'lat=1e3&lon=0', 'lat[$ne]=1&lon=0', 'lat=41&lon=-87&radiusKm=0', 'lat=41&lon=-87&radiusKm=51', 'lat=41&lon=-87&radiusKm=x', 'lat=41&lon=-87&type=pharmacy', 'lat=41&lon=-87&type[$ne]=hospital']) {
    assert.equal((await api('GET', `/places/nearby?${q}`, { token: u.token })).status, 400, q);
  }
  assert.equal((await api('GET', '/places/geocode', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/places/geocode?q=a', { token: u.token })).status, 400);
  assert.equal((await api('GET', '/places/geocode?q=someone@example.com', { token: u.token })).status, 400);
  assert.equal(calls.length, 0, 'bad requests must not cause outbound calls');
});

test('nearby returns hospitals sorted by distance, with cleaned details', async () => {
  const u = await signUp();
  const a = area();
  const res = await near(u, a, '&radiusKm=10');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.results.map((r) => r.name), ['Near Hospital', 'Far Hospital']);
  const far = res.body.results[1];
  assert.equal(far.id, 'way/1001');
  assert.equal(far.phone, '+1 312 555 0100');
  assert.equal(far.website, 'https://farhospital.example.org/');
  assert.equal(far.emergency, true);
  assert.equal(far.address, '5 Main St, Chicago');
  assert.ok(far.distanceKm > res.body.results[0].distanceKm);
  assert.equal(res.body.stale, false);
  assert.match(res.body.attribution, /OpenStreetMap/);
});

test('the position is rounded before use and never appears in the response beyond that', async () => {
  const u = await signUp();
  const res = await near(u, { lat: '41.884567', lon: '-70.126789' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.center, { lat: 41.88, lon: -70.13 });
  const sent = calls[0].body;
  assert.ok(sent.includes('41.88,-70.13'), sent);
  assert.ok(!sent.includes('41.884567') && !sent.includes('70.126789'), 'exact position must not leave the server');
});

test('results are cached per rounded area, and nearby positions share one lookup', async () => {
  const u = await signUp();
  await near(u, { lat: '41.881', lon: '-71.001' });
  await near(u, { lat: '41.884', lon: '-71.004' });
  assert.equal(calls.length, 1);
  await near(u, { lat: '41.881', lon: '-71.001' }, '&type=clinic');
  assert.equal(calls.length, 2, 'a different type is a different lookup');
});

test('concurrent identical lookups make a single outbound call', async () => {
  const u = await signUp();
  const a = area();
  const all = await Promise.all([near(u, a), near(u, a), near(u, a)]);
  assert.ok(all.every((r) => r.status === 200));
  assert.equal(calls.length, 1);
});

test('when Overpass is busy or returns a web page, it falls back to Nominatim', async () => {
  const u = await signUp();
  for (const mode of ['busy', 'html']) {
    overpass = mode;
    calls = [];
    const res = await near(u, area());
    assert.equal(res.status, 200, mode);
    assert.equal(res.body.source, 'nominatim');
    assert.deepEqual(res.body.results.map((r) => r.name), ['Nominatim Hospital'], 'other kinds of place are filtered out');
    assert.ok(calls.some((c) => c.url.includes('nominatim')));
  }
});

test('a failing Overpass server is skipped for a while, so later searches go straight to the fallback', async () => {
  const u = await signUp();
  overpass = 'busy';
  await near(u, area());
  const firstOverpassCalls = calls.filter((c) => !c.url.includes('nominatim')).length;
  assert.ok(firstOverpassCalls >= 1);
  calls = [];
  const res = await near(u, area());
  assert.equal(res.status, 200);
  assert.equal(calls.filter((c) => !c.url.includes('nominatim')).length, 0, 'Overpass is not retried during the cool-down');
});

test('hostile map data is neutralised: text, links, ids and positions', async () => {
  const u = await signUp();
  overpass = 'evil';
  const res = await near(u, area());
  assert.equal(res.status, 200);
  const byId = Object.fromEntries(res.body.results.map((r) => [r.id, r]));
  assert.equal(res.body.results.length, 3, 'a place with no usable position is dropped');
  assert.equal(byId['node/2001'].name, 'Good & Hospital');
  assert.equal(byId['node/2001'].website, null);
  assert.equal(byId['node/2001'].phone, null);
  assert.equal(byId['node/2002'].website, null);
  assert.equal(res.body.results.find((r) => r.name === 'Bad Id Hospital').id, null, 'an unsafe id is dropped, not passed on');
  assert.ok(!JSON.stringify(res.body).includes('<'), 'no markup survives');
});

test('when every source is down: 503 with no detail; an older answer is served (stale) if we have one', async () => {
  const u = await signUp();
  const a = area();
  overpass = 'busy';
  nominatim = 'down';
  const down = await near(u, a);
  assert.equal(down.status, 503);
  assert.equal(down.body.code, 'unavailable');
  assert.ok(!/network|Nominatim|Overpass|Error/.test(JSON.stringify(down.body)), 'no internals leaked');

  overpass = 'ok';
  places._resetBreaker();
  assert.equal((await near(u, a)).body.stale, false);
  // Age the cache entry by making the next lookup fail after it has expired.
  const realNow = Date.now;
  Date.now = () => realNow() + 7 * 60 * 60 * 1000;
  try {
    overpass = 'busy';
    const stale = await near(u, a);
    assert.equal(stale.status, 200);
    assert.equal(stale.body.stale, true);
    assert.equal(stale.body.results.length, 2);
  } finally {
    Date.now = realNow;
  }
});

test('geocode returns cleaned candidates and caches them', async () => {
  const u = await signUp();
  const res = await api('GET', '/places/geocode?q=Denver', { token: u.token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.results, [{ label: 'Denver, Colorado, United States', lat: 39.74, lon: -104.98 }]);
  await api('GET', '/places/geocode?q=denver', { token: u.token });
  assert.equal(calls.length, 1);
  nominatim = 'down';
  places._clearCache();
  assert.equal((await api('GET', '/places/geocode?q=Denver', { token: u.token })).status, 503);
});

test('the Overpass query is built from validated numbers only', () => {
  const q = places.overpassQuery({ lat: 41.884567, lon: -87.63, radiusM: 5000.4, type: 'clinic' });
  assert.match(q, /around:5000,41\.88,-87\.63/);
  assert.match(q, /"amenity"="clinic"/);
  assert.match(q, /"healthcare"="urgent_care"/);
  assert.equal(places.safeUrl('ftp://x.example.org'), null);
  assert.equal(places.safeUrl('localhost'), null);
  assert.equal(places.safePhone('abc'), null);
});
