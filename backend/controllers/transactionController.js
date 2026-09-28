const Transaction = require('../models/Transaction');
const { isDbConnected } = require('../config/db');
const memoryStore = require('../utils/memoryStore');

// @desc    Get user transactions
// @route   GET /api/transactions
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { type, category, startDate, endDate, search } = req.query;

    if (isDbConnected()) {
      const query = { user: req.user._id };

      if (type && type !== 'all') query.type = type;
      if (category && category !== 'all') query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }
      if (search) {
        query.$and = [
          { user: req.user._id },
          {
            $or: [
              { description: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } },
            ],
          },
        ];
      }

      const transactions = await Transaction.find(query).sort({ date: -1 });
      return res.json({ success: true, count: transactions.length, data: transactions });
    }

    // In-memory filter
    let items = memoryStore.transactions.filter((t) => t.user === userId);
    if (type && type !== 'all') items = items.filter((t) => t.type === type);
    if (category && category !== 'all') items = items.filter((t) => t.category === category);
    if (startDate) items = items.filter((t) => new Date(t.date) >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      items = items.filter((t) => new Date(t.date) <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    console.error('Error getting transactions:', err);
    res.status(500).json({ error: 'Server error retrieving transactions' });
  }
};

// @desc    Get transaction summary analytics
// @route   GET /api/transactions/summary
exports.getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    let transactions = [];

    if (isDbConnected()) {
      transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
    } else {
      transactions = memoryStore.transactions.filter((t) => t.user === userId);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const monthlyMap = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      }

      const dateObj = new Date(tx.date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        monthlyMap[monthKey].income += amt;
      } else {
        monthlyMap[monthKey].expense += amt;
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0;

    const categoryBreakdown = Object.keys(categoryTotals).map((cat) => ({
      category: cat,
      amount: categoryTotals[cat],
      percentage: totalExpense > 0 ? ((categoryTotals[cat] / totalExpense) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.amount - a.amount);

    const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpense,
        balance,
        savingsRate: Number(savingsRate),
        transactionCount: transactions.length,
        categoryBreakdown,
        monthlyTrend,
        recentTransactions: transactions.slice(0, 5),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error generating summary' });
  }
};

// @desc    Create a transaction
// @route   POST /api/transactions
exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { type, category, amount, date, description, title } = req.body;

    if (!type || !category || amount === undefined || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Please provide valid type, category, and positive amount' });
    }

    const desc = description || title || '';

    if (isDbConnected()) {
      const created = await Transaction.create({
        user: req.user._id,
        type,
        category: category.trim(),
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description: desc.trim(),
      });
      return res.status(201).json({ success: true, data: created });
    }

    // In-memory
    const newTx = {
      _id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      user: userId,
      type,
      category: category.trim(),
      amount: Number(amount),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      description: desc.trim(),
      title: desc.trim(),
      createdAt: new Date().toISOString(),
    };

    memoryStore.transactions.unshift(newTx);
    return res.status(201).json({ success: true, data: newTx });
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(400).json({ error: err.message || 'Error creating transaction' });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const { type, category, amount, date, description, title } = req.body;

    const updates = {};
    if (type) updates.type = type;
    if (category) updates.category = category.trim();
    if (amount !== undefined) updates.amount = Number(amount);
    if (date) updates.date = new Date(date);
    if (description !== undefined || title !== undefined) {
      updates.description = (description || title || '').trim();
    }

    if (isDbConnected()) {
      const updated = await Transaction.findOneAndUpdate(
        { _id: id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ error: 'Transaction not found' });
      return res.json({ success: true, data: updated });
    }

    const index = memoryStore.transactions.findIndex((t) => t._id === id && t.user === userId);
    if (index === -1) return res.status(404).json({ error: 'Transaction not found' });

    memoryStore.transactions[index] = {
      ...memoryStore.transactions[index],
      ...updates,
      title: updates.description || memoryStore.transactions[index].title,
      updatedAt: new Date().toISOString(),
    };

    return res.json({ success: true, data: memoryStore.transactions[index] });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error updating transaction' });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id ? req.user._id.toString() : req.user.id;

    if (isDbConnected()) {
      const deleted = await Transaction.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deleted) return res.status(404).json({ error: 'Transaction not found' });
      return res.json({ success: true, message: 'Transaction deleted' });
    }

    const initialLength = memoryStore.transactions.length;
    memoryStore.transactions = memoryStore.transactions.filter(
      (t) => !(t._id === id && t.user === userId)
    );

    if (memoryStore.transactions.length === initialLength) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting transaction' });
  }
};
