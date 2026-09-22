const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USER_ROLES = ['user', 'moderator', 'admin'];
const USER_STATUSES = ['active', 'suspended', 'deleted'];

const userSchema = new mongoose.Schema({
  // --- Private: never shown to other members ---------------------------
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: EMAIL_PATTERN,
  },
  // select:false keeps the hash out of every query unless explicitly requested.
  password: { type: String, required: true, select: false },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  phone: { type: String, trim: true, maxlength: 30 },
  emailVerified: { type: Boolean, default: false },

  // --- Public identity: the only thing other members see ----------------
  handle: { type: String, required: true, unique: true, lowercase: true, trim: true, match: HANDLE_PATTERN },
  bio: { type: String, trim: true, maxlength: 280, default: '' },

  // --- Access control ------------------------------------------------------
  role: { type: String, enum: USER_ROLES, default: 'user' },
  status: { type: String, enum: USER_STATUSES, default: 'active' },
  suspendedUntil: { type: Date },
  suspensionReason: { type: String, maxlength: 500 },
  // Bumped on password change / forced logout; tokens carry the version they
  // were issued under, so old ones stop working immediately.
  tokenVersion: { type: Number, default: 0 },

  // --- AI-assisted insights (off until the member opts in) -------------------
  ai: {
    consentAt: Date,
    consentVersion: String,
    enabled: { type: Boolean, default: false },
    // The most possibilities a single insight may show. The member can lower it at any time.
    maxPossibilities: { type: Number, min: 1, max: 3, default: 3 },
  },

  // --- Consent record ------------------------------------------------------
  consent: {
    termsVersion: String,
    acceptedAt: Date,
    ageConfirmed: Boolean,
  },

  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
});

// Hash only when the password actually changed. (The previous version called
// next() without returning, then hashed anyway — re-hashing the hash on every
// unrelated save and locking the user out.)
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, config.bcryptCost);
});

userSchema.methods.matchPassword = function matchPassword(entered) {
  return bcrypt.compare(entered, this.password);
};

/** Suspended accounts can read but not post; a suspension with an end date lapses on its own. */
userSchema.methods.isSuspended = function isSuspended() {
  if (this.status !== 'suspended') return false;
  return !this.suspendedUntil || this.suspendedUntil.getTime() > Date.now();
};

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.HANDLE_PATTERN = HANDLE_PATTERN;
module.exports.EMAIL_PATTERN = EMAIL_PATTERN;
module.exports.USER_ROLES = USER_ROLES;
