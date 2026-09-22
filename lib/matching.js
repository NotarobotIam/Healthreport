// "People like me": scores how similar another member's shared pain entry is
// to one of yours. Pure functions, no database access.

const MAX_PROXIMITY_M = 0.3; // beyond ~30 cm apart on the body, location adds nothing
const CLOSE_M = 0.02; // within 2 cm counts as the same spot

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

/**
 * Score 0–100. Location dominates (it's what "pain like mine" mostly means),
 * then the kind of pain, then severity and behaviour.
 */
function scoreMatch(mine, theirs) {
  const d = distance(mine.location.point, theirs.location.point);
  const proximity = 50 * clamp(1 - (d - CLOSE_M) / (MAX_PROXIMITY_M - CLOSE_M), 0, 1);

  const samePart = mine.location.partId === theirs.location.partId;
  let place = 0;
  if (samePart) place = 20;
  else if (mine.location.system === theirs.location.system) place = 8;

  if (proximity === 0) {
    // Far apart on the body: only the same structure counts (e.g. two ends of a long
    // bone), and only weakly. Merely sharing a system (both "muscles") is no match.
    if (!samePart) return 0;
    place = 10;
  }

  const types = 15 * jaccard(mine.painTypes, theirs.painTypes);
  const severity = 4 * (1 - Math.abs(mine.severity - theirs.severity) / 10);
  const pattern = mine.pattern === theirs.pattern ? 5 : 0;
  return Math.round(proximity + place + types + severity + pattern);
}

function band(score) {
  if (score >= 65) return 'very-similar';
  if (score >= 40) return 'similar';
  if (score >= 22) return 'somewhat-similar';
  return null;
}

/** Coarse duration so an exact start date can't be used to identify someone. */
function durationBucket(onset, now = Date.now()) {
  const days = (now - new Date(onset).getTime()) / 86400000;
  if (days < 2) return 'a day or two';
  if (days < 14) return 'a few days to two weeks';
  if (days < 90) return 'a few weeks to three months';
  if (days < 365) return 'several months';
  return 'over a year';
}

/**
 * Ranks candidate entries against `mine`, keeping only each member's best
 * match. Each candidate: { userId, ...entry fields }. Returns
 * [{ userId, score, band, entry }] best first.
 */
function rankMatches(mine, candidates, { limit = 20 } = {}) {
  const bestByUser = new Map();
  for (const c of candidates) {
    const score = scoreMatch(mine, c);
    const b = band(score);
    if (!b) continue;
    const key = String(c.userId);
    const prev = bestByUser.get(key);
    if (!prev || score > prev.score) bestByUser.set(key, { userId: c.userId, score, band: b, entry: c });
  }
  return [...bestByUser.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Smallest group size at which counts are shown; below it, numbers could single someone out. */
const MIN_GROUP_SIZE = 3;

module.exports = { scoreMatch, band, durationBucket, rankMatches, distance, MIN_GROUP_SIZE };
