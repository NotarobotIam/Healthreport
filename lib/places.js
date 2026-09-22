// Finds hospitals and urgent-care clinics near a place, using OpenStreetMap data (Overpass API, with
// Nominatim as a fallback) — free and key-less, so it costs nothing.
//
// Privacy: the *browser* rounds the member's position to about 1 km before sending it, this server rounds
// it again, and it is used only for the lookup: it is never stored or logged. Requests to OpenStreetMap
// services come from this server, so those services never see the member's IP address. Results are cached
// per rounded area, which also keeps us well within the services' fair-use limits.
//
// Trust: everything that comes back is untrusted. Names and addresses are reduced to plain text, links are
// rebuilt from validated URLs (http/https only), and map links are built from numeric ids.
const config = require('../config');
const { cleanText } = require('./plainText');

const OVERPASS_URLS = (process.env.OVERPASS_URLS || 'https://overpass-api.de/api/interpreter,https://overpass.private.coffee/api/interpreter')
  .split(',').map((s) => s.trim()).filter(Boolean);
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = `health-community/1.0${config.ncbiEmail ? ` (${config.ncbiEmail})` : ''}`; // Nominatim's policy asks apps to identify themselves
const ATTEMPT_TIMEOUT_MS = 8000;
const BREAKER_MS = 2 * 60 * 1000; // a server that just failed is skipped for this long, so people aren't kept waiting on it
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 300;
const MAX_RESULTS = 25;
const TYPES = ['hospital', 'clinic'];

class PlacesUnavailableError extends Error {}

let doFetch = (...a) => fetch(...a);
let paceMs = 1100; // Nominatim allows one request a second
const _setFetch = (fn) => { doFetch = fn; };
const _setPace = (ms) => { paceMs = ms; };
const _resetBreaker = () => overpassDownUntil.clear();
const _clearCache = () => { cache.clear(); geocodeCache.clear(); _resetBreaker(); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve();
let last = 0;
/** Runs calls one at a time with a gap between them. */
function paced(fn) {
  const run = chain.then(async () => {
    const wait = Math.min(paceMs, last + paceMs - Date.now()); // clamped, so a clock adjustment can never stall us
    if (wait > 0) await sleep(wait);
    last = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}

/** Position rounded to two decimal places (about 1 km). */
const roundCoord = (n) => Math.round(n * 100) / 100;

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** http/https links only, with a real host. Anything else (javascript:, data:, …) is dropped. */
function safeUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().split(/[;\s]/)[0];
  if (!raw || raw.length > 200) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

function safePhone(value) {
  if (typeof value !== 'string') return null;
  const first = value.split(/[;,]/)[0].replace(/[^0-9+()\-\s.]/g, '').trim();
  return first.length >= 5 && first.length <= 25 ? first : null;
}

const joinParts = (parts) => parts.map((p) => cleanText(p || '', 80)).filter(Boolean);

function shape({ osmType, osmId, name, lat, lon, tags, address }, center) {
  const cleanName = cleanText(name || '', 120);
  if (!cleanName || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const t = tags || {};
  const street = joinParts([t['addr:housenumber'], t['addr:street']]).join(' ') || (address ? joinParts([address.house_number, address.road]).join(' ') : '');
  const town = joinParts([t['addr:city'] || (address && (address.city || address.town || address.village)), t['addr:state'] || (address && address.state), t['addr:postcode'] || (address && address.postcode)]).join(', ');
  return {
    id: /^(node|way|relation)$/.test(osmType) && /^\d+$/.test(String(osmId)) ? `${osmType}/${osmId}` : null,
    name: cleanName,
    lat: Math.round(lat * 1e5) / 1e5,
    lon: Math.round(lon * 1e5) / 1e5,
    distanceKm: Math.round(haversineKm(center.lat, center.lon, lat, lon) * 10) / 10,
    address: [street, town].filter(Boolean).join(', '),
    phone: safePhone(t.phone || t['contact:phone']),
    website: safeUrl(t.website || t['contact:website']),
    emergency: String(t.emergency || '').toLowerCase() === 'yes',
    openingHours: cleanText(t.opening_hours || '', 100) || null,
  };
}

function finalize(items) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .filter((p) => {
      const key = `${p.name.toLowerCase()}|${Math.round(p.lat * 200)}|${Math.round(p.lon * 200)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);
}

// ------------------------------------------------------------------------------------------ Overpass

/** The query is built only from numbers we validated ourselves, never from request text. */
function overpassQuery({ lat, lon, radiusM, type }) {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(2)},${lon.toFixed(2)})`;
  const selectors = type === 'hospital' ? [`nwr["amenity"="hospital"]${around};`] : [`nwr["amenity"="clinic"]${around};`, `nwr["healthcare"="urgent_care"]${around};`];
  return `[out:json][timeout:10];(${selectors.join('')});out center tags 80;`;
}

const overpassDownUntil = new Map();

async function viaOverpass(args) {
  let lastError = new Error('Overpass is being skipped after recent failures');
  for (const url of OVERPASS_URLS) {
    if ((overpassDownUntil.get(url) || 0) > Date.now()) continue;
    try {
      const res = await paced(() =>
        doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, Accept: 'application/json' },
          body: `data=${encodeURIComponent(overpassQuery(args))}`,
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        }),
      );
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json(); // an overloaded server answers with an HTML error page; that throws here
      if (!json || !Array.isArray(json.elements)) throw new Error('Overpass returned no elements');
      return json.elements.map((el) => shape({ osmType: el.type, osmId: el.id, name: el.tags && el.tags.name, lat: el.lat ?? (el.center && el.center.lat), lon: el.lon ?? (el.center && el.center.lon), tags: el.tags }, args));
    } catch (err) {
      overpassDownUntil.set(url, Date.now() + BREAKER_MS);
      lastError = err;
    }
  }
  throw lastError;
}

// ----------------------------------------------------------------------------------------- Nominatim

async function viaNominatim(args) {
  const dLat = args.radiusM / 111320;
  const dLon = args.radiusM / (111320 * Math.max(0.2, Math.cos((args.lat * Math.PI) / 180)));
  const params = new URLSearchParams({
    format: 'jsonv2', q: args.type === 'hospital' ? 'hospital' : 'urgent care clinic', bounded: '1', limit: '40', extratags: '1', addressdetails: '1',
    viewbox: `${(args.lon - dLon).toFixed(4)},${(args.lat + dLat).toFixed(4)},${(args.lon + dLon).toFixed(4)},${(args.lat - dLat).toFixed(4)}`,
  });
  const res = await paced(() => doFetch(`${NOMINATIM}?${params}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) }));
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('Nominatim returned no list');
  return rows
    .filter((r) => (args.type === 'hospital' ? r.type === 'hospital' : ['clinic', 'urgent_care', 'doctors'].includes(r.type)))
    .map((r) => shape({ osmType: r.osm_type, osmId: r.osm_id, name: r.name || (r.display_name || '').split(',')[0], lat: Number(r.lat), lon: Number(r.lon), tags: r.extratags, address: r.address }, args));
}

// -------------------------------------------------------------------------------------------- public

const cache = new Map();
const inflight = new Map();

/**
 * Hospitals or clinics around a position. `lat`/`lon` must already be validated numbers.
 * Returns { results, source, stale }. If every source fails, an older cached answer for the area is served
 * (marked stale); with nothing cached, PlacesUnavailableError is thrown.
 */
async function nearby({ lat, lon, radiusM, type }) {
  if (!TYPES.includes(type)) throw new Error('unknown type');
  const args = { lat: roundCoord(lat), lon: roundCoord(lon), radiusM: Math.min(50000, Math.max(1000, radiusM)), type };
  const key = `${type}:${args.lat}:${args.lon}:${args.radiusM}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { results: hit.results, source: hit.source, stale: false, center: { lat: args.lat, lon: args.lon } };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      let results;
      let source = 'overpass';
      try {
        results = finalize(await viaOverpass(args));
      } catch {
        source = 'nominatim';
        results = finalize(await viaNominatim(args));
      }
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), results, source });
      return { results, source, stale: false, center: { lat: args.lat, lon: args.lon } };
    } catch {
      if (hit) return { results: hit.results, source: hit.source, stale: true, center: { lat: args.lat, lon: args.lon } };
      throw new PlacesUnavailableError('places unavailable');
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

const geocodeCache = new Map();

/** Turns a typed place ("Denver", "80203", "Leeds UK") into a few candidate locations. */
async function geocode(query) {
  const q = cleanText(query, 100);
  const key = q.toLowerCase();
  const hit = geocodeCache.get(key);
  if (hit && Date.now() - hit.at < GEOCODE_TTL_MS) return hit.results;
  const params = new URLSearchParams({ format: 'jsonv2', q, limit: '5', addressdetails: '0' });
  let rows;
  try {
    const res = await paced(() => doFetch(`${NOMINATIM}?${params}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) }));
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('bad geocode reply');
  } catch {
    throw new PlacesUnavailableError('geocoder unavailable');
  }
  const results = rows
    .map((r) => ({ label: cleanText(r.display_name || '', 140), lat: roundCoord(Number(r.lat)), lon: roundCoord(Number(r.lon)) }))
    .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lon) && Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180)
    .slice(0, 5);
  if (geocodeCache.size >= MAX_CACHE) geocodeCache.delete(geocodeCache.keys().next().value);
  geocodeCache.set(key, { at: Date.now(), results });
  return results;
}

module.exports = { nearby, geocode, PlacesUnavailableError, TYPES, roundCoord, haversineKm, safeUrl, safePhone, overpassQuery, _setFetch, _setPace, _clearCache, _resetBreaker };
