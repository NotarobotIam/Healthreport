const express = require('express');
const User = require('../models/User');
const protect = require('../middleware/auth');
const demoStore = require('../demoStore');

const router = express.Router();

// Demo mode flag
const DEMO_MODE = process.env.DEMO_MODE === 'true' || true; // Enable demo mode by default

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    if (DEMO_MODE) {
      const user = demoStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(200).json({
        success: true,
        user,
      });
    }

    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, dateOfBirth, gender, phone } = req.body;

    if (DEMO_MODE) {
      const user = demoStore.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      Object.assign(user, { name, dateOfBirth, gender, phone });
      return res.status(200).json({
        success: true,
        user,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, dateOfBirth, gender, phone },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
