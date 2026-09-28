const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDbConnected } = require('../config/db');
const memoryStore = require('../utils/memoryStore');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'spendwise_ai_jwt_secret_group18', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, currency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        currency: currency || 'USD',
      });

      return res.status(201).json({
        success: true,
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
        },
      });
    }

    // In-memory fallback
    const existing = memoryStore.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = {
      _id: 'user-' + Date.now(),
      id: 'user-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      currency: currency || 'USD',
      createdAt: new Date().toISOString(),
    };

    memoryStore.addUser(newUser);

    return res.status(201).json({
      success: true,
      token: generateToken(newUser.id),
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        currency: newUser.currency,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error registering user' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.json({
        success: true,
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
        },
      });
    }

    // In-memory login
    const user = memoryStore.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      token: generateToken(user._id || user.id),
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error logging in' });
  }
};

// @desc    1-Click Demo Login
// @route   POST /api/auth/demo
exports.demoLogin = async (req, res) => {
  try {
    const demoEmail = 'demo@spendwise.ai';
    let user;

    if (isDbConnected()) {
      user = await User.findOne({ email: demoEmail });
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('demo123', salt);
        user = await User.create({
          name: 'Sreerag C Madhu',
          email: demoEmail,
          password: hashedPassword,
          currency: 'USD',
        });
      }
    } else {
      user = memoryStore.findUserByEmail(demoEmail);
    }

    const id = user._id ? user._id.toString() : user.id;
    return res.json({
      success: true,
      token: generateToken(id),
      user: {
        id,
        name: user.name,
        email: user.email,
        currency: user.currency || 'USD',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error generating demo session' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};
