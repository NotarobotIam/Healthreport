const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const protect = require('../middleware/auth');
const demoStore = require('../demoStore');

const router = express.Router();

// Demo mode flag
const DEMO_MODE = process.env.DEMO_MODE === 'true' || true; // Enable demo mode by default

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'demo-secret-key', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, dateOfBirth, gender, phone } = req.body;

    if (DEMO_MODE) {
      // Demo mode - use in-memory store
      let user = demoStore.findUserByEmail(email);
      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = demoStore.createUser({
        name,
        email,
        password: hashedPassword,
        dateOfBirth,
        gender,
        phone,
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    // Database mode
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    user = new User({
      name,
      email,
      password,
      dateOfBirth,
      gender,
      phone,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login a user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide an email and password' });
    }

    if (DEMO_MODE) {
      // Demo mode - use in-memory store
      const user = demoStore.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    }

    // Database mode
    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
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

// @route   POST /api/auth/handoff
// @desc    Issue a short-lived, single-use code the logged-in user can hand
//          to the digital-twin app (a different origin) to authenticate
//          there without exposing the long-lived JWT in a URL
// @access  Private
router.post('/handoff', protect, (req, res) => {
  const code = demoStore.createHandoffCode(req.user.id);
  res.status(200).json({ success: true, code });
});

// @route   POST /api/auth/handoff/exchange
// @desc    Exchange a handoff code (see /handoff) for a real session token
// @access  Public
router.post('/handoff/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Missing code' });
    }

    const userId = demoStore.consumeHandoffCode(code);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid or expired code' });
    }

    const user = demoStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = generateToken(userId);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
