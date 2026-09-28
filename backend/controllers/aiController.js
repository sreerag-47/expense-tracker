const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { isDbConnected } = require('../config/db');
const memoryStore = require('../utils/memoryStore');
const aiHelper = require('../utils/aiHelper');

// @desc    Get AI spending insights & anomaly detection
// @route   GET /api/ai/insights
// @route   POST /api/ai/insights
exports.getSpendingInsights = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    let transactions = [];
    let budgets = [];

    if (isDbConnected()) {
      transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
      budgets = await Budget.find({ user: req.user._id });
    } else {
      transactions = memoryStore.transactions.filter((t) => t.user === userId);
      budgets = memoryStore.budgets.filter((b) => b.user === userId);
    }

    const result = await aiHelper.generateInsights({
      transactions,
      user: req.user,
      budgets,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Error analyzing spending:', err);
    res.status(500).json({ error: 'Server error analyzing spending.' });
  }
};

// @desc    Interactive Advisor Q&A
// @route   POST /api/ai/chat
exports.askAdvisor = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    let transactions = [];

    if (isDbConnected()) {
      transactions = await Transaction.find({ user: req.user._id });
    } else {
      transactions = memoryStore.transactions.filter((t) => t.user === userId);
    }

    const result = await aiHelper.askGeminiAdvisor({
      question: question.trim(),
      user: req.user,
      transactions,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error in AI chat' });
  }
};

// @desc    Get API Key Status from .env
// @route   GET /api/ai/apikey
exports.getApiKeyStatus = (req, res) => {
  const currentKey = aiHelper.getApiKey();
  const isConfigured = Boolean(
    currentKey && currentKey !== 'your_gemini_api_key_here' && currentKey.trim().length > 10
  );

  res.json({
    success: true,
    isConfigured,
  });
};
