// Rules applied to everything members post. Deliberately simple and
// transparent — a first line of defence, not a substitute for moderators.

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const URL = /\b(?:https?:\/\/|www\.)\S+/i;
// 9+ digits, allowing spaces, dashes, dots and brackets between them: phone numbers,
// but not lab values, doses or dates.
const PHONE = /(?:\+?\d[\s().-]?){9,}/;

/**
 * Cleans text before storage: removes control and invisible bidirectional
 * characters (used to disguise content), normalises line endings and
 * collapses runs of blank lines. Rendering is always as plain text.
 */
function normalize(input) {
  return String(input)
    .replace(CONTROL_CHARS, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Returns a list of human-readable problems (empty when the text is fine).
 * Contact details and links are rejected to protect members' privacy and to
 * blunt spam; the message says what to remove so it isn't a guessing game.
 */
function findProblems(text) {
  const problems = [];
  if (EMAIL.test(text)) problems.push('Please remove email addresses — for your privacy, keep contact details out of posts.');
  if (PHONE.test(text)) problems.push('Please remove phone numbers — for your privacy, keep contact details out of posts.');
  if (URL.test(text)) problems.push('Links are not allowed in posts.');
  return problems;
}

const CRISIS_PATTERNS = [
  /\bsuicid/i,
  /\bkill(?:ing)? (?:myself|my ?self)\b/i,
  /\bend(?:ing)? (?:my|it all|my own) (?:life|it)\b/i,
  /\bwant(?:ed)? to die\b/i,
  /\bwish i (?:was|were) dead\b/i,
  /\bdon'?t want to (?:live|be alive|be here anymore)\b/i,
  /\bbetter off (?:dead|without me)\b/i,
  /\b(?:hurt|harm|cut)(?:ting)? myself\b/i,
  /\bself[- ]?harm/i,
  /\bno (?:reason|point) (?:to|in) (?:live|living|going on)\b/i,
];

/** True when the text contains language suggesting the author may be in crisis. */
function detectCrisis(text) {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

module.exports = { normalize, findProblems, detectCrisis };
