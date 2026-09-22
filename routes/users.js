const express = require('express');
const User = require('../models/User');
const protect = require('../middleware/auth');
const { handler } = require('../middleware/errors');
const { text } = require('../lib/validate');

const router = express.Router();

const GENDERS = ['Male', 'Female', 'Other'];

// @route   GET /api/users/profile
// @desc    Get the signed-in user's own profile (includes private fields)
// @access  Private
router.get('/profile', protect, (req, res) => {
  res.status(200).json({ success: true, user: req.account });
});

// @route   PUT /api/users/profile
// @desc    Update profile. Only whitelisted fields; the username, email, role and
//          status can't be changed here.
// @access  Private
router.put(
  '/profile',
  protect,
  handler(async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (body.name !== undefined) {
      const name = text(body.name, { min: 1, max: 100 });
      if (!name) return res.status(400).json({ message: 'Please enter your name' });
      update.name = name;
    }
    if (body.bio !== undefined) {
      const bio = text(body.bio, { max: 280 });
      if (bio === null) return res.status(400).json({ message: 'Bio must be 280 characters or fewer' });
      update.bio = bio;
    }
    if (body.dateOfBirth !== undefined) {
      if (body.dateOfBirth === '' || body.dateOfBirth === null) {
        update.dateOfBirth = null;
      } else {
        const dob = new Date(body.dateOfBirth);
        if (typeof body.dateOfBirth !== 'string' || Number.isNaN(dob.getTime()) || dob > new Date()) {
          return res.status(400).json({ message: 'Please enter a valid date of birth' });
        }
        update.dateOfBirth = dob;
      }
    }
    if (body.gender !== undefined) {
      if (body.gender !== '' && !GENDERS.includes(body.gender)) return res.status(400).json({ message: 'Invalid gender' });
      update.gender = body.gender || null;
    }
    if (body.phone !== undefined) {
      const phone = text(body.phone, { max: 30 });
      if (phone === null) return res.status(400).json({ message: 'Invalid phone number' });
      update.phone = phone;
    }

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true });
    return res.status(200).json({ success: true, user });
  }),
);

module.exports = router;
