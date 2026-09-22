const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { serverError } = require('./errors');

const unauthorized = (res) => res.status(401).json({ message: 'Not authorized to access this route' });

/** Issues a session token bound to the user's current tokenVersion. */
function signToken(user) {
  return jwt.sign({ id: String(user._id), tv: user.tokenVersion }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Requires a valid session. Loads the account on every request (one indexed
 * lookup) so suspensions, deletions, role changes and password changes take
 * effect immediately instead of when the token expires.
 *
 * Sets req.user = { id, handle, role, status, suspended } and req.account (the document).
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return unauthorized(res);
  const token = header.slice(7).trim();

  let payload;
  try {
    // Pin the algorithm so a forged "alg: none" token is rejected.
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return unauthorized(res);
  }

  try {
    const user = await User.findById(payload.id);
    if (!user || user.status === 'deleted' || user.tokenVersion !== payload.tv) return unauthorized(res);
    req.account = user;
    req.user = {
      id: String(user._id),
      handle: user.handle,
      role: user.role,
      status: user.status,
      suspended: user.isSuspended(),
    };
    return next();
  } catch (err) {
    return serverError(res, err);
  }
};

/** After protect: blocks suspended members from creating content. */
const requireNotSuspended = (req, res, next) => {
  if (req.user.suspended) {
    return res.status(403).json({
      message: 'Your account is suspended, so you can read but not post. Contact support if you think this is a mistake.',
    });
  }
  return next();
};

/** After protect: limits a route to the given roles. */
const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Not authorized' });

module.exports = protect;
module.exports.protect = protect;
module.exports.signToken = signToken;
module.exports.requireNotSuspended = requireNotSuspended;
module.exports.requireRole = requireRole;
