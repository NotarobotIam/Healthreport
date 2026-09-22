const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const { HANDLE_PATTERN, EMAIL_PATTERN } = require('../models/User');
const protect = require('../middleware/auth');
const { signToken } = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');
const { text, passwordProblem, RESERVED_HANDLES } = require('../lib/validate');

const router = express.Router();

const GENDERS = ['Male', 'Female', 'Other'];

// Compared against when the email is unknown, so "no such user" and "wrong
// password" take the same time and can't be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptCost);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  handle: user.handle,
  role: user.role,
});

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  registerLimiter,
  handler(async (req, res) => {
    const body = req.body || {};
    const name = text(body.name, { min: 1, max: 100 });
    const email = text(body.email, { min: 3, max: 254 })?.toLowerCase();
    const handle = text(body.handle, { min: 3, max: 20 })?.toLowerCase();

    if (!name) return res.status(400).json({ message: 'Please enter your name' });
    if (!email || !EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
    if (!handle || !HANDLE_PATTERN.test(handle)) {
      return res.status(400).json({ message: 'Username must be 3-20 characters: lowercase letters, numbers and underscores' });
    }
    if (RESERVED_HANDLES.has(handle)) return res.status(400).json({ message: 'That username is not available' });

    const pwProblem = passwordProblem(body.password, { email, handle });
    if (pwProblem) return res.status(400).json({ message: pwProblem });

    // Consent must be explicit: a health community holds sensitive information.
    if (body.ageConfirmed !== true) return res.status(400).json({ message: 'You must confirm you are 18 or older' });
    if (body.acceptTerms !== true) return res.status(400).json({ message: 'You must accept the Terms and Privacy Policy' });

    let dateOfBirth;
    if (body.dateOfBirth) {
      dateOfBirth = new Date(body.dateOfBirth);
      if (typeof body.dateOfBirth !== 'string' || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
        return res.status(400).json({ message: 'Please enter a valid date of birth' });
      }
    }
    const gender = body.gender && GENDERS.includes(body.gender) ? body.gender : undefined;
    const phone = text(body.phone, { max: 30 }) || undefined;

    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
    if (await User.exists({ handle })) return res.status(409).json({ message: 'That username is taken' });

    let user;
    try {
      user = await User.create({
        name,
        email,
        handle,
        password: body.password,
        dateOfBirth,
        gender,
        phone,
        consent: { termsVersion: config.termsVersion, acceptedAt: new Date(), ageConfirmed: true },
      });
    } catch (err) {
      // Lost a race with another sign-up between the checks above and the insert.
      if (err.code === 11000) return res.status(409).json({ message: 'That email or username is already taken' });
      throw err;
    }

    return res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
  }),
);

// @route   POST /api/auth/login
// @desc    Login a user
// @access  Public
router.post(
  '/login',
  loginLimiter,
  handler(async (req, res) => {
    const email = text(req.body?.email, { min: 1, max: 254 })?.toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : null;
    if (!email || !password || password.length > 128) {
      return res.status(400).json({ message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok || user.status === 'deleted') return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLoginAt = new Date();
    await user.save();
    return res.status(200).json({ success: true, token: signToken(user), user: publicUser(user) });
  }),
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, (req, res) => {
  res.status(200).json({ success: true, user: req.account });
});

// @route   PUT /api/auth/password
// @desc    Change password; signs out every other session
// @access  Private
router.put(
  '/password',
  protect,
  loginLimiter,
  handler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.id).select('+password');
    if (typeof currentPassword !== 'string' || !(await user.matchPassword(currentPassword))) {
      // 403, not 401: the session is fine, only this confirmation failed (a 401 would sign the user out).
      return res.status(403).json({ message: 'Current password is incorrect' });
    }
    const problem = passwordProblem(newPassword, { email: user.email, handle: user.handle });
    if (problem) return res.status(400).json({ message: problem });

    user.password = newPassword;
    user.tokenVersion += 1;
    await user.save();
    return res.status(200).json({ success: true, token: signToken(user) });
  }),
);

module.exports = router;
