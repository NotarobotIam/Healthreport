// Mirrors CRISIS_PATTERNS in lib/contentPolicy.js. Used only to show support
// resources while someone is typing — the server does its own check on submit.
const CRISIS_PATTERNS: RegExp[] = [
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

export function looksLikeCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}
