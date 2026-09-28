const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDbConnected } = require('../config/db');

// Multi-tenant in-memory storage fallback for users & session persistence
const memoryStore = require('../utils/memoryStore');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, please sign in' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'spendwise_ai_jwt_secret_group18');

    if (isDbConnected()) {
      req.user = await User.findById(decoded.id).select('-password');
    } else {
      req.user = memoryStore.findUserById(decoded.id);
    }

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User session expired or not found' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

module.exports = { protect };
