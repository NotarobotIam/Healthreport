const mongoose = require('mongoose');
const Block = require('../models/Block');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Report = require('../models/Report');
const { PAIN_TYPES, PAIN_SIDES } = require('../models/painConstants');
const { text, isPlainObject } = require('./validate');
const { normalize, findProblems } = require('./contentPolicy');

// mongoose.set('sanitizeFilter', true) turns any {$op: ...} in a query into a literal, which
// is what we want for request data. Operators we write ourselves must be marked trusted.
const trusted = mongoose.trusted;

/** Ids of members the given member has blocked. */
async function blockedIds(userId) {
  const blocks = await Block.find({ userId }).select('blockedId').lean();
  return blocks.map((b) => b.blockedId);
}

/** How an author appears to other members. Real name and email never leave the server. */
function authorView(user) {
  if (!user || user.status === 'deleted') return { handle: null, deleted: true, role: 'user' };
  return { handle: user.handle, deleted: false, role: user.role === 'user' ? 'user' : user.role };
}

const excerpt = (s, n = 220) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

/** Page/limit from a query string, clamped so a client can't request the world. */
function paging(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Validates the text fields of a post. Returns { value } or { error, problems }.
 * Titles and bodies are normalised (invisible characters stripped) before checks.
 */
function parsePostText({ title, body }, { titleRequired, bodyMin, bodyMax }) {
  const value = {};
  const problems = [];
  if (titleRequired || title !== undefined) {
    const t = typeof title === 'string' ? normalize(title) : null;
    if (!t || t.length < 5 || t.length > 140) return { error: 'Title must be between 5 and 140 characters' };
    value.title = t;
    problems.push(...findProblems(t));
  }
  if (body !== undefined || bodyMin > 0) {
    const b = typeof body === 'string' ? normalize(body) : null;
    if (b === null || b.length < bodyMin || b.length > bodyMax) {
      return { error: `Message must be between ${bodyMin} and ${bodyMax} characters` };
    }
    value.body = b;
    problems.push(...findProblems(b));
  }
  if (problems.length) return { error: problems[0], problems: [...new Set(problems)] };
  return { value };
}

/** Optional body-location tag on a thread. Returns { value } (possibly undefined) or { error }. */
function parseRegion(region) {
  if (region === undefined || region === null) return { value: undefined };
  if (!isPlainObject(region)) return { error: 'region must be an object' };
  const partId = region.partId === undefined ? undefined : text(region.partId, { min: 1, max: 40 });
  const partName = region.partName === undefined ? undefined : text(region.partName, { min: 1, max: 200 });
  const system = region.system === undefined ? undefined : text(region.system, { min: 1, max: 40 });
  if ((region.partId !== undefined && !partId) || (region.partName !== undefined && !partName) || (region.system !== undefined && !system)) {
    return { error: 'region is invalid' };
  }
  if (region.side !== undefined && !PAIN_SIDES.includes(region.side)) return { error: 'region.side is invalid' };
  if (!partId && !system) return { error: 'region needs a partId or a system' };
  return { value: { partId, partName, system, side: region.side } };
}

function parsePainTypes(types) {
  if (types === undefined) return { value: [] };
  if (!Array.isArray(types) || types.length > 5 || !types.every((t) => PAIN_TYPES.includes(t))) {
    return { error: 'painTypes must be up to 5 known pain types' };
  }
  return { value: [...new Set(types)] };
}

/**
 * Takes a post down. The text is cleared, not just flagged, so a removed post
 * can't be recovered from the API — that also honours "delete my post".
 */
async function removeContent(type, doc, by) {
  const wasVisible = doc.status === 'visible';
  doc.status = 'removed';
  doc.removedBy = by;
  doc.body = '';
  if (type === 'thread') doc.title = '[removed]';
  await doc.save();
  if (type === 'reply' && wasVisible) await Thread.updateOne({ _id: doc.threadId }, { $inc: { replyCount: -1 } });
}

/** Hides a post pending review: text is kept so a moderator can restore it. */
async function hideContent(type, doc) {
  const wasVisible = doc.status === 'visible';
  doc.status = 'hidden';
  await doc.save();
  if (type === 'reply' && wasVisible) await Thread.updateOne({ _id: doc.threadId }, { $inc: { replyCount: -1 } });
}

/** Files a report on behalf of the system (e.g. crisis language), so moderators see it. */
async function raiseSystemReport(targetType, targetId, reason, details) {
  await Report.create({ source: 'system', reporterId: null, targetType, targetId, reason, details });
}

module.exports = {
  trusted, blockedIds, authorView, excerpt, paging, parsePostText, parseRegion, parsePainTypes,
  removeContent, hideContent, raiseSystemReport, Reply,
};
