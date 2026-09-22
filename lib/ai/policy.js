// When a member may create each kind of insight. Pure function: everything it needs is passed in.
//
//   basic     the free, rules-based summary        — needs 6 records; nothing leaves this site
//   deep      an AI look at the records            — 6 records, consent, room in the monthly limit, new records + time since last
//   question  an AI answer to a typed question     — consent and room in the monthly limit
//
// For every kind, the previous insight or answer must have been followed up first (ask a doctor, or limit).

const THRESHOLD = 6; // records needed before the first insight
const NEW_RECORDS_NEEDED = 3; // further records needed before the next deep look
const MIN_DAYS_BETWEEN = 7; // between deep looks
const DAY = 86400000;

/**
 * @returns {{eligible:boolean, reason:string|null, remaining:number, nextEligibleAt:Date|null}}
 */
function evaluateEligibility({ mode = 'deep', count = 0, latestDeep = null, unresolved = false, settings, available = true, used = 0, limit = Infinity, resetsAt = null, now = Date.now() }) {
  const no = (reason, remaining = 0, nextEligibleAt = null) => ({ eligible: false, reason, remaining, nextEligibleAt });
  const needsConsent = mode !== 'basic';

  if (needsConsent && !available) return no('unavailable');
  if (mode !== 'question' && count < THRESHOLD) return no('need-more-logs', THRESHOLD - count);
  if (needsConsent) {
    if (!settings || !settings.consentAt) return no('need-consent');
    if (!settings.enabled) return no('turned-off');
  }
  // The follow-up is what makes each result land somewhere useful, so it comes before anything new.
  if (unresolved) return no('follow-up-required');
  if (mode === 'deep' && latestDeep) {
    const newSince = count - latestDeep.basisCount;
    if (newSince < NEW_RECORDS_NEEDED) return no('need-more-new-logs', NEW_RECORDS_NEEDED - newSince);
    const next = new Date(new Date(latestDeep.createdAt).getTime() + MIN_DAYS_BETWEEN * DAY);
    if (next.getTime() > now) return no('too-soon', 0, next);
  }
  if (needsConsent && used >= limit) return no('quota-reached', 0, resetsAt);
  return { eligible: true, reason: null, remaining: 0, nextEligibleAt: null };
}

module.exports = { evaluateEligibility, THRESHOLD, NEW_RECORDS_NEEDED, MIN_DAYS_BETWEEN };
