const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { isDbConnected } = require('../config/db');
const memoryStore = require('../utils/memoryStore');

// @desc    Get user budgets with actual spending vs limit comparisons
// @route   GET /api/budgets
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    let budgets = [];
    let transactions = [];

    if (isDbConnected()) {
      budgets = await Budget.find({ user: req.user._id, month, year });

      // Start & end of month
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      transactions = await Transaction.find({
        user: req.user._id,
        type: 'expense',
        date: { $gte: start, $lte: end },
      });
    } else {
      budgets = memoryStore.budgets.filter(
        (b) => b.user === userId && b.month === month && b.year === year
      );

      transactions = memoryStore.transactions.filter((t) => {
        if (t.user !== userId || t.type !== 'expense') return false;
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
    }

    // Map category to total spent in the month
    const categorySpent = {};
    transactions.forEach((tx) => {
      categorySpent[tx.category] = (categorySpent[tx.category] || 0) + Number(tx.amount || 0);
    });

    const comparison = budgets.map((b) => {
      const limit = Number(b.limit);
      const spent = categorySpent[b.category] || 0;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const remaining = Math.max(0, limit - spent);

      let status = 'normal'; // normal, warning, exceeded
      if (percentage >= 100) {
        status = 'exceeded';
      } else if (percentage >= 80) {
        status = 'warning';
      }

      return {
        _id: b._id,
        category: b.category,
        limit,
        spent,
        remaining,
        percentage,
        month: b.month,
        year: b.year,
        status,
      };
    });

    const totalBudget = comparison.reduce((sum, item) => sum + item.limit, 0);
    const totalSpent = comparison.reduce((sum, item) => sum + item.spent, 0);

    const alerts = comparison
      .filter((item) => item.status === 'warning' || item.status === 'exceeded')
      .map((item) => {
        if (item.status === 'exceeded') {
          return `Over Budget Alert: You have exceeded your "${item.category}" budget by $${item.spent - item.limit} (${item.percentage}% used).`;
        }
        return `Threshold Warning: You have used ${item.percentage}% of your "${item.category}" budget limit ($${item.spent}/$${item.limit}).`;
      });

    return res.json({
      success: true,
      month,
      year,
      totalBudget,
      totalSpent,
      data: comparison,
      alerts,
    });
  } catch (err) {
    console.error('Error fetching budgets:', err);
    res.status(500).json({ error: 'Server error retrieving budgets' });
  }
};

// @desc    Set or create a budget limit
// @route   POST /api/budgets
exports.createBudget = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { category, limit, month, year } = req.body;

    if (!category || limit === undefined || isNaN(limit) || Number(limit) <= 0) {
      return res.status(400).json({ error: 'Please specify category and valid positive limit' });
    }

    const now = new Date();
    const bMonth = parseInt(month) || now.getMonth() + 1;
    const bYear = parseInt(year) || now.getFullYear();

    if (isDbConnected()) {
      const budget = await Budget.findOneAndUpdate(
        { user: req.user._id, category: category.trim(), month: bMonth, year: bYear },
        { limit: Number(limit) },
        { upsert: true, new: true, runValidators: true }
      );
      return res.status(201).json({ success: true, data: budget });
    }

    // In-memory
    const existingIndex = memoryStore.budgets.findIndex(
      (b) => b.user === userId && b.category === category.trim() && b.month === bMonth && b.year === bYear
    );

    if (existingIndex !== -1) {
      memoryStore.budgets[existingIndex].limit = Number(limit);
      return res.status(200).json({ success: true, data: memoryStore.budgets[existingIndex] });
    }

    const newBudget = {
      _id: 'b-' + Date.now(),
      user: userId,
      category: category.trim(),
      limit: Number(limit),
      month: bMonth,
      year: bYear,
    };

    memoryStore.budgets.push(newBudget);
    return res.status(201).json({ success: true, data: newBudget });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error setting budget' });
  }
};

// @desc    Delete a budget limit
// @route   DELETE /api/budgets/:id
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDbConnected()) {
      const deleted = await Budget.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deleted) return res.status(404).json({ error: 'Budget not found' });
      return res.json({ success: true, message: 'Budget removed' });
    }

    const initialLength = memoryStore.budgets.length;
    memoryStore.budgets = memoryStore.budgets.filter((b) => !(b._id === id && b.user === userId));

    if (memoryStore.budgets.length === initialLength) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    return res.json({ success: true, message: 'Budget removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting budget' });
  }
};
