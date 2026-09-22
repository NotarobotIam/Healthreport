// Fetches recent, condition-specific listings from PubMed (NCBI E-utilities) for each community.
//
// Privacy: requests are keyed by *community topic*, never by member, and every community is
// refreshed on a schedule whether or not anyone has joined. PubMed therefore learns nothing
// about any individual, and members never wait on (or trigger) an outbound request.
//
// Trust: everything that comes back is untrusted text. Titles are stripped of markup and
// length-capped, and links are rebuilt from a validated numeric PubMed id — a URL supplied by
// the remote service is never used.
const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config');
const ResearchItem = require('../models/ResearchItem');
const ResearchFeed = require('../models/ResearchFeed');
const { GROUPS, getGroup } = require('./groups');

// Our own $-operators must be marked trusted, or mongoose's sanitizeFilter turns them into literals.
const { trusted } = mongoose;

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const KINDS = ['research', 'tests'];
const FRESH_MS = 24 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 30 * 60 * 1000;
const PER_FEED = 8;
const LOOKBACK_DAYS = 120;
const REQUEST_TIMEOUT_MS = 10_000;

let doFetch = (...args) => fetch(...args);
let paceMs = config.ncbiApiKey ? 120 : 400; // NCBI allows 3 requests/second without a key, 10 with one
/** Test hooks: swap the network and the pacing. */
const _setFetch = (fn) => { doFetch = fn; };
const _setPace = (ms) => { paceMs = ms; };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let chain = Promise.resolve();
let lastCall = 0;
/** Runs network calls one at a time, spaced out, so we never exceed NCBI's limit. */
function paced(fn) {
  const run = chain.then(async () => {
    const wait = lastCall + paceMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    return fn();
  });
  chain = run.catch(() => {});
  return run;
}

const NOISE = 'NOT ("in silico"[ti] OR "molecular docking"[ti] OR "virtual screening"[ti] OR synthesis[ti] OR "network pharmacology"[ti])';
const RESEARCH_TYPES = 'Clinical Trial[pt] OR Randomized Controlled Trial[pt] OR Review[pt] OR Meta-Analysis[pt] OR Systematic Review[pt] OR Guideline[pt]';
const TEST_WORDS = 'diagnos*[ti] OR screening[ti] OR biomarker*[ti] OR "early detection"[ti] OR assay[ti] OR test[ti] OR testing[ti] OR "blood test"[ti] OR imaging[ti]';

/** PubMed search string for a community. Never built from anything a member typed. */
function buildQuery(group, kind) {
  const heading = group.exact ? 'Majr:NoExp' : 'Majr';
  const topic = `(${[...group.mesh.map((m) => `"${m}"[${heading}]`), ...group.title.map((t) => `"${t}"[ti]`)].join(' OR ')})`;
  const focus = kind === 'tests' ? TEST_WORDS : RESEARCH_TYPES;
  return `${topic} AND (${focus}) AND hasabstract ${NOISE}`;
}

/** Identifies the exact search behind a feed, so a changed catalogue entry refreshes itself. */
const queryHash = (group, kind) => crypto.createHash('sha1').update(buildQuery(group, kind)).digest('hex').slice(0, 12);

const { cleanText } = require('./plainText');

const ALLOWED_TYPES = new Map([
  ['Randomized Controlled Trial', 'Randomized trial'],
  ['Clinical Trial', 'Clinical trial'],
  ['Meta-Analysis', 'Meta-analysis'],
  ['Systematic Review', 'Systematic review'],
  ['Review', 'Review'],
  ['Guideline', 'Guideline'],
]);

/** Turns an esummary JSON document into cleaned items. Anything malformed is skipped. */
function parseSummary(json) {
  const result = json && json.result;
  if (!result || !Array.isArray(result.uids)) return [];
  const items = [];
  for (const uid of result.uids) {
    const r = result[uid];
    if (!r || !/^\d{1,10}$/.test(String(uid))) continue;
    const title = cleanText(r.title, 300);
    if (!title) continue;
    const sortDate = new Date(String(r.sortpubdate || '').replace(/\//g, '-').slice(0, 10));
    items.push({
      pmid: String(uid),
      title,
      journal: cleanText(r.source, 200),
      authors: (Array.isArray(r.authors) ? r.authors : []).slice(0, 3).map((a) => cleanText(a && a.name, 80)).filter(Boolean),
      published: cleanText(r.epubdate || r.pubdate, 40),
      types: (Array.isArray(r.pubtype) ? r.pubtype : []).map((t) => ALLOWED_TYPES.get(t)).filter(Boolean).slice(0, 2),
      sortDate: Number.isNaN(sortDate.getTime()) ? new Date() : sortDate,
    });
  }
  return items;
}

function identity() {
  const p = { tool: 'health-community' };
  if (config.ncbiEmail) p.email = config.ncbiEmail;
  if (config.ncbiApiKey) p.api_key = config.ncbiApiKey;
  return p;
}

async function getJson(endpoint, params) {
  const url = `${BASE}/${endpoint}?${new URLSearchParams({ ...identity(), db: 'pubmed', retmode: 'json', ...params })}`;
  const res = await paced(() => doFetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { Accept: 'application/json' } }));
  if (!res.ok) throw new Error(`PubMed responded ${res.status}`);
  return res.json();
}

/** Asks PubMed for a community's recent items. Two requests: search, then summaries. */
async function fetchFeedItems(group, kind) {
  const search = await getJson('esearch.fcgi', {
    term: buildQuery(group, kind),
    retmax: String(PER_FEED),
    sort: 'pub date',
    datetype: 'edat', // the date the article was *added to PubMed*, so "new" means new
    reldate: String(LOOKBACK_DAYS),
  });
  const ids = ((search.esearchresult && search.esearchresult.idlist) || []).filter((id) => /^\d{1,10}$/.test(String(id)));
  if (ids.length === 0) return [];
  return parseSummary(await getJson('esummary.fcgi', { id: ids.join(',') }));
}

const inflight = new Map();

/** Refreshes one feed and stores it. Never throws: on failure the old items stay and a retry is scheduled. */
function refreshFeed(slug, kind) {
  const key = `${slug}:${kind}`;
  if (inflight.has(key)) return inflight.get(key); // single-flight: concurrent callers share one request
  const group = getGroup(slug);
  if (!group || !KINDS.includes(kind)) return Promise.resolve(false);

  const job = (async () => {
    try {
      const items = await fetchFeedItems(group, kind);
      const now = new Date();
      if (items.length) {
        await ResearchItem.bulkWrite(
          items.map((it) => ({
            updateOne: { filter: { group: slug, kind, pmid: it.pmid }, update: { $set: { ...it, group: slug, kind, fetchedAt: now } }, upsert: true },
          })),
        );
      }
      // Drop anything that has fallen out of the window, so the feed doesn't grow without bound.
      await ResearchItem.deleteMany({ group: slug, kind, pmid: trusted({ $nin: items.map((i) => i.pmid) }) });
      await ResearchFeed.updateOne({ group: slug, kind }, { $set: { refreshedAt: now, queryHash: queryHash(group, kind) }, $unset: { lastError: 1, retryAfter: 1 } }, { upsert: true });
      return true;
    } catch (err) {
      await ResearchFeed.updateOne(
        { group: slug, kind },
        { $set: { lastError: cleanText(err.message, 200), retryAfter: new Date(Date.now() + RETRY_AFTER_FAILURE_MS) } },
        { upsert: true },
      ).catch(() => {});
      return false;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

/** Needs refreshing if never fetched, old, or fetched with a different search than the catalogue now says. */
const isStale = (feed, hash, now = Date.now()) =>
  (!feed || !feed.refreshedAt || feed.queryHash !== hash || now - feed.refreshedAt.getTime() > FRESH_MS) &&
  !(feed && feed.retryAfter && feed.retryAfter.getTime() > now);

/**
 * Cached items for some communities. Stale feeds are refreshed in the background. If there is
 * nothing at all yet (first ever request), waits briefly for the first fetch rather than showing a blank.
 */
async function getItems(slugs, kind, { limit = 5, perGroup = 3, waitMs = 6000 } = {}) {
  const valid = slugs.filter((s) => getGroup(s));
  const feeds = await ResearchFeed.find({ group: trusted({ $in: valid }), kind }).lean();
  const feedBySlug = new Map(feeds.map((f) => [f.group, f]));
  // A feed that has never been fetched has nothing to show yet, so wait (briefly) for its first
  // fetch to finish rather than reading half-written results. Feeds that are merely stale keep
  // serving what they have while they refresh in the background.
  const firstFetches = [];
  for (const slug of valid) {
    const feed = feedBySlug.get(slug);
    const hash = queryHash(getGroup(slug), kind);
    if (!isStale(feed, hash)) continue;
    const job = refreshFeed(slug, kind);
    if (!feed || !feed.refreshedAt || feed.queryHash !== hash) firstFetches.push(job);
  }
  if (firstFetches.length) await Promise.race([Promise.allSettled(firstFetches), sleep(waitMs)]);
  const rows = await ResearchItem.find({ group: trusted({ $in: valid }), kind }).sort({ sortDate: -1 }).lean();

  // A paper indexed under several of your communities (asthma and COPD, IBS and IBD…) is listed once.
  const seen = new Set();
  const taken = new Map();
  const picked = [];
  for (const r of rows) {
    if (seen.has(r.pmid)) continue;
    seen.add(r.pmid);
    const n = taken.get(r.group) || 0;
    if (n >= perGroup) continue;
    taken.set(r.group, n + 1);
    picked.push(r);
    if (picked.length >= limit) break;
  }
  const updatedAt = feeds.reduce((max, f) => (f.refreshedAt && (!max || f.refreshedAt > max) ? f.refreshedAt : max), null);
  return {
    updatedAt,
    refreshing: rows.length === 0 && valid.some((s) => inflight.has(`${s}:${kind}`)),
    items: picked.map((r) => ({
      pmid: r.pmid,
      title: r.title,
      journal: r.journal,
      authors: r.authors,
      published: r.published,
      types: r.types,
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`, // rebuilt from the validated id, never taken from the remote response
      group: { slug: r.group, name: getGroup(r.group).name },
    })),
  };
}

/** Keeps every community's feeds warm, independent of who is (or isn't) using the site. */
function startRefresher({ intervalMs = 6 * 60 * 60 * 1000, log = console.log } = {}) {
  const sweep = async () => {
    let refreshed = 0;
    for (const g of GROUPS) {
      for (const kind of KINDS) {
        const feed = await ResearchFeed.findOne({ group: g.slug, kind }).lean();
        if (isStale(feed, queryHash(g, kind)) && (await refreshFeed(g.slug, kind))) refreshed += 1;
      }
    }
    log(`Research feeds checked: ${refreshed} refreshed`);
  };
  sweep().catch((e) => log('Research sweep failed:', e.message));
  const timer = setInterval(() => sweep().catch((e) => log('Research sweep failed:', e.message)), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { KINDS, buildQuery, queryHash, cleanText, parseSummary, refreshFeed, getItems, startRefresher, isStale, _setFetch, _setPace };
