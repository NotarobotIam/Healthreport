const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('../config');

// Functional tests hit the same endpoints hundreds of times; they set
// RATE_LIMIT_DISABLED=1. The switch is ignored in production.
const skip = () => !config.isProd && process.env.RATE_LIMIT_DISABLED === '1';

const tooMany = (message) => ({ message });

// Broad ceiling for every API call from one address.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: tooMany('Too many requests. Please slow down.'),
});

// Only failed logins count, so a legitimate user isn't locked out by successful ones.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: tooMany('Too many login attempts. Try again in a few minutes.'),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: tooMany('Too many sign-ups from this network. Try again later.'),
});

/**
 * Per-signed-in-user limiter for content creation. Keyed by user id (falling
 * back to IP) so one abusive account can't flood the community, and shared
 * networks don't throttle each other.
 */
function perUserLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip,
    keyGenerator: (req) => (req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip)),
    message: tooMany(message),
  });
}

module.exports = { apiLimiter, loginLimiter, registerLimiter, perUserLimiter };
