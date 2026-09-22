// Small validation helpers. Every value that reaches a database query must
// have been proven to be a plain string/number/etc. first: an attacker who
// sends {"email": {"$ne": null}} would otherwise turn a lookup into a match-all.

/** Returns the trimmed string if `v` is a string within [min, max] characters, else null. */
function text(v, { min = 0, max = 1000 } = {}) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Not exhaustive — a speed bump for the most-guessed passwords, on top of the length rule.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'password1234', '1234567890', '12345678910',
  'qwertyuiop', 'qwerty12345', 'iloveyou12', 'letmein1234', 'welcome1234', 'admin12345', 'abc1234567',
  'changeme123', 'passw0rd123', '0123456789', '1q2w3e4r5t', 'monkey12345', 'dragon12345',
]);

const RESERVED_HANDLES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'staff', 'system', 'help', 'root', 'team',
  'anonymous', 'anon', 'deleted', 'removed', 'official', 'healthreport', 'security', 'abuse', 'null', 'undefined',
]);

/** Returns an error string, or null if the password is acceptable. */
function passwordProblem(password, { email = '', handle = '' } = {}) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 10) return 'Password must be at least 10 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return 'That password is too common. Please choose another';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && lower.includes(local)) return 'Password must not contain your email address';
  if (handle && handle.length >= 4 && lower.includes(handle.toLowerCase())) return 'Password must not contain your username';
  return null;
}

module.exports = { text, isPlainObject, passwordProblem, RESERVED_HANDLES };
