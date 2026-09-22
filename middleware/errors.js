const mongoose = require('mongoose');
const config = require('../config');

/**
 * Reports an unexpected failure. The real error is logged for the operator;
 * clients only see a generic message in production so internals (stack
 * details, query shapes, validation internals) never leak.
 */
function serverError(res, error) {
  console.error(error);
  const message = config.isProd ? 'Something went wrong. Please try again.' : error.message;
  return res.status(500).json({ message });
}

/** Wraps an async route so a thrown error reaches serverError instead of hanging the request. */
const handler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => serverError(res, err));

/** router.param('id', validateObjectId): malformed ids are a 404, not a CastError 500. */
function validateObjectId(req, res, next, value) {
  if (!mongoose.isValidObjectId(value) || String(new mongoose.Types.ObjectId(value)) !== String(value)) {
    return res.status(404).json({ message: 'Not found' });
  }
  return next();
}

function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Body-parser failures (bad JSON, oversized payload) are the client's fault.
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON' });
  return serverError(res, err);
}

module.exports = { serverError, handler, validateObjectId, notFound, errorHandler };
