require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');

const User = require('./models/User');
const Expense = require('./models/Expense');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';
const JWT_SECRET = process.env.JWT_SECRET || 'spendwise_ai_super_secret_jwt_key_group18';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory fallback store for offline/demo mode
let isDbConnected = false;

// Pre-hashed password for demo user ("demo123")
const DEMO_PASSWORD_HASH = bcrypt.hashSync('demo123', 10);

let memoryUsers = [
  {
    _id: 'user-demo-18',
    name: 'Sreerag C Madhu',
    email: 'demo@spendwise.ai',
    password: DEMO_PASSWORD_HASH,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'user-shivani-18',
    name: 'Shivani Anil',
    email: 'shivani@spendwise.ai',
    password: DEMO_PASSWORD_HASH,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'user-sreya-18',
    name: 'Sreya N V',
    email: 'sreya@spendwise.ai',
    password: DEMO_PASSWORD_HASH,
    createdAt: new Date().toISOString(),
  },
];

let memoryExpenses = [
  // Demo transactions for user-demo-18
  {
    _id: 'seed-1',
    user: 'user-demo-18',
    title: 'Monthly Tech Salary',
    amount: 55000,
    type: 'income',
    category: 'Salary',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Primary monthly compensation deposit',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-2',
    user: 'user-demo-18',
    title: 'Modern Apartment Rent',
    amount: 14000,
    type: 'expense',
    category: 'Housing',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Monthly apartment rental lease',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-3',
    user: 'user-demo-18',
    title: 'Organic Grocery Market',
    amount: 4200,
    type: 'expense',
    category: 'Food',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Whole foods and seasonal fresh produce',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-4',
    user: 'user-demo-18',
    title: 'Freelance AI Consultation',
    amount: 15000,
    type: 'income',
    category: 'Freelance',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Client workflow automation project',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-5',
    user: 'user-demo-18',
    title: 'Financial Modeling Course',
    amount: 2200,
    type: 'expense',
    category: 'Education',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'SDG 4 - Advanced wealth literacy',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-6',
    user: 'user-demo-18',
    title: 'Clean Energy & Fiber Bill',
    amount: 2100,
    type: 'expense',
    category: 'Utilities',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Renewable utilities & gigabit net',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'seed-7',
    user: 'user-demo-18',
    title: 'Artisan Cafe & Dining',
    amount: 1650,
    type: 'expense',
    category: 'Food',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Weekend dining with colleagues',
    createdAt: new Date().toISOString(),
  },
  // Sample transaction for user-shivani-18 to confirm isolation
  {
    _id: 'seed-8',
    user: 'user-shivani-18',
    title: 'Design Agency Retainer',
    amount: 48000,
    type: 'income',
    category: 'Salary',
    date: new Date().toISOString(),
    notes: 'UX consultation payout',
    createdAt: new Date().toISOString(),
  },
];

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 2500,
  })
  .then(() => {
    isDbConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    isDbConnected = false;
    console.warn(`[MongoDB] Notice: Could not connect to MongoDB (${err.message}).`);
    console.warn(`[MongoDB] Running in multi-user in-memory fallback mode so all features & logins work immediately!`);
  });

mongoose.connection.on('disconnected', () => { isDbConnected = false; });
mongoose.connection.on('connected', () => { isDbConnected = true; });

// Helper: JWT Generator
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

// Auth Guard Middleware
async function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isDbConnected) {
      req.user = await User.findById(decoded.id).select('-password');
    } else {
      const found = memoryUsers.find((u) => u._id === decoded.id);
      if (found) {
        req.user = { _id: found._id, name: found.name, email: found.email };
      }
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Session expired or user account not found.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Helper: Gemini AI Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// ==========================================
// 1. SYSTEM STATUS ROUTE
// ==========================================
app.get('/api/status', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'online',
    mongoConnected: isDbConnected,
    aiConfigured: hasGeminiKey,
    storageMode: isDbConnected ? 'MongoDB' : 'In-Memory (Multi-Tenant)',
    group: 'Group 18',
    team: ['Shivani Anil', 'Sreerag C Madhu', 'Sreya N V'],
  });
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your full name' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDbConnected) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
      });

      const token = generateToken(user._id.toString());
      return res.status(201).json({
        success: true,
        token,
        user: { _id: user._id, name: user.name, email: user.email },
      });
    }

    // In-memory registration
    const userExists = memoryUsers.find((u) => u.email === cleanEmail);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = {
      _id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    memoryUsers.push(newUser);

    const token = generateToken(newUser._id);
    return res.status(201).json({
      success: true,
      token,
      user: { _id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDbConnected) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = generateToken(user._id.toString());
      return res.json({
        success: true,
        token,
        user: { _id: user._id, name: user.name, email: user.email },
      });
    }

    // In-memory login
    const user = memoryUsers.find((u) => u.email === cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    return res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Demo 1-Click Login (Sreerag Demo Account)
app.post('/api/auth/demo', async (req, res) => {
  try {
    const demoEmail = 'demo@spendwise.ai';
    let demoUser;

    if (isDbConnected) {
      demoUser = await User.findOne({ email: demoEmail });
      if (!demoUser) {
        demoUser = await User.create({
          name: 'Sreerag C Madhu',
          email: demoEmail,
          password: DEMO_PASSWORD_HASH,
        });
      }
    } else {
      demoUser = memoryUsers.find((u) => u.email === demoEmail);
    }

    const token = generateToken(demoUser._id.toString());
    res.json({
      success: true,
      token,
      user: { _id: demoUser._id, name: demoUser.name, email: demoUser.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Current User Profile
app.get('/api/auth/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ==========================================
// 3. USER-SCOPED EXPENSES & ANALYTICS
// ==========================================

// Analytics Summary Endpoint (User-scoped)
app.get('/api/expenses/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    let userTransactions = [];

    if (isDbConnected) {
      userTransactions = await Expense.find({ user: req.user._id }).sort({ date: -1 });
    } else {
      userTransactions = memoryExpenses.filter((item) => item.user === userId);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const monthlyMap = {};

    userTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
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
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

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
        transactionCount: userTransactions.length,
        categoryBreakdown,
        monthlyTrend,
        recentTransactions: userTransactions.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Error in summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get User's Transactions (with filters)
app.get('/api/expenses', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { type, category, startDate, endDate, search } = req.query;

    if (isDbConnected) {
      const filter = { user: req.user._id };
      if (type && type !== 'all') filter.type = type;
      if (category && category !== 'all') filter.category = category;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.date.$lte = end;
        }
      }
      if (search) {
        filter.$and = [
          { user: req.user._id },
          {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { notes: { $regex: search, $options: 'i' } },
              { category: { $regex: search, $options: 'i' } },
            ],
          },
        ];
      }

      const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
      return res.json({ success: true, count: expenses.length, data: expenses });
    }

    // In-memory user filter
    let filtered = memoryExpenses.filter((item) => item.user === userId);

    if (type && type !== 'all') filtered = filtered.filter((item) => item.type === type);
    if (category && category !== 'all') filtered = filtered.filter((item) => item.category === category);
    if (startDate) filtered = filtered.filter((item) => new Date(item.date) >= new Date(startDate));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => new Date(item.date) <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q)) ||
          item.category.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Single Transaction
app.get('/api/expenses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (isDbConnected) {
      const expense = await Expense.findOne({ _id: id, user: req.user._id });
      if (!expense) return res.status(404).json({ success: false, message: 'Transaction not found' });
      return res.json({ success: true, data: expense });
    }

    const expense = memoryExpenses.find((item) => item._id === id && item.user === userId);
    if (!expense) return res.status(404).json({ success: false, message: 'Transaction not found' });
    return res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Transaction
app.post('/api/expenses', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { title, amount, type, category, date, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid description' });
    }
    if (amount === undefined || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be income or expense' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const payload = {
      title: title.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
      date: date ? new Date(date) : new Date(),
      notes: notes ? notes.trim() : '',
      user: req.user._id,
    };

    if (isDbConnected) {
      const created = await Expense.create(payload);
      return res.status(201).json({ success: true, data: created });
    }

    const newExpense = {
      _id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      ...payload,
      user: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryExpenses.unshift(newExpense);
    return res.status(201).json({ success: true, data: newExpense });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update Transaction
app.put('/api/expenses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();
    const { title, amount, type, category, date, notes } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (amount !== undefined) updates.amount = Number(amount);
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category.trim();
    if (date !== undefined) updates.date = new Date(date);
    if (notes !== undefined) updates.notes = notes.trim();

    if (isDbConnected) {
      const updated = await Expense.findOneAndUpdate(
        { _id: id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: 'Transaction not found' });
      return res.json({ success: true, data: updated });
    }

    const index = memoryExpenses.findIndex((item) => item._id === id && item.user === userId);
    if (index === -1) return res.status(404).json({ success: false, message: 'Transaction not found' });

    memoryExpenses[index] = {
      ...memoryExpenses[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return res.json({ success: true, data: memoryExpenses[index] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete Transaction
app.delete('/api/expenses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (isDbConnected) {
      const deleted = await Expense.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deleted) return res.status(404).json({ success: false, message: 'Transaction not found' });
      return res.json({ success: true, message: 'Transaction deleted successfully' });
    }

    const initialLength = memoryExpenses.length;
    memoryExpenses = memoryExpenses.filter((item) => !(item._id === id && item.user === userId));
    if (memoryExpenses.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. SCOPED GEMINI AI ENDPOINTS
// ==========================================

// AI Spending Analysis (User-scoped)
app.post('/api/ai/insights', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const userName = req.user.name || 'User';

    let userTransactions = [];
    if (isDbConnected) {
      userTransactions = await Expense.find({ user: req.user._id }).sort({ date: -1 });
    } else {
      userTransactions = memoryExpenses.filter((item) => item.user === userId);
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    userTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') totalIncome += amt;
      else {
        totalExpense += amt;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amt;
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: ₹${amt} (${totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0}%)`)
      .join(', ');

    const recentTxSample = userTransactions.slice(0, 8).map(
      (t) => `- [${t.type.toUpperCase()}] ${t.title}: ₹${t.amount} (${t.category})`
    ).join('\n');

    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        isLiveAI: false,
        insights: `### 🤖 AI Financial Advisor (Demo Mode)

> **Notice:** Set your \`GEMINI_API_KEY\` in the \`.env\` file to activate live real-time analysis powered by **Google Gemini 2.5 Flash**!

#### 1. 📊 Financial Profile: ${userName}
- **Total Inflow:** ₹${totalIncome.toLocaleString()}
- **Total Outflow:** ₹${totalExpense.toLocaleString()}
- **Net Liquidity:** ₹${balance.toLocaleString()}
- **Savings Rate:** **${savingsRate}%** ${savingsRate >= 20 ? '🟢 (Optimal Reserve)' : '🟠 (Needs Attention: Target ≥20%)'}

#### 2. 🎯 Key Spending Observations
- Primary Outflow Channels: **${topCategories || 'No expense records yet'}**.
- Review discretionary expenses to expand emergency buffer.

#### 3. 🌍 SDG Alignment Strategies
- **SDG 8 (Decent Work & Economic Growth):** Prioritize an emergency fund covering 3–6 months of basic living expenses (approx ₹${(totalExpense * 3).toLocaleString()}).
- **SDG 4 (Quality Education):** Follow the **50/30/20 allocation rule** (50% Essential, 30% Discretionary, 20% Compounding & Debt reduction).
- **SDG 12 (Responsible Consumption):** Minimize subscription waste and impulsive digital food deliveries.

#### 4. 💡 Immediate Actionable Next Steps
1. Automate 15% of salary immediately upon receipt into interest-bearing savings.
2. Cap weekly leisure dining to ₹${Math.round((totalExpense * 0.15) / 4 || 500)}.
3. Review weekly category summaries in the Analytics tab.`,
      });
    }

    const prompt = `You are a private wealth and financial planning advisor integrated into SpendWise AI (Group 18 project: Shivani Anil, Sreerag C Madhu, Sreya N V).
The user is: ${userName}
United Nations SDG Alignment:
- SDG 8: Decent Work & Economic Growth (financial resilience, wealth accumulation)
- SDG 4: Quality Education (practical budgeting literacy, 50/30/20 principles)
- SDG 12: Responsible Consumption & Production (curbing runaway consumerism)

Financial Profile for ${userName}:
- Total Inflow: ₹${totalIncome}
- Total Outflow: ₹${totalExpense}
- Net Balance: ₹${balance}
- Current Savings Rate: ${savingsRate}%
- Top Outflow Categories: ${topCategories || 'None recorded'}
- Recent Transaction Sample:
${recentTxSample || 'No transactions'}

Deliver a clean, elegant, professional report formatted in GitHub Markdown with headings, bullet points, and emojis.
Include:
1. 🩺 Financial Health Score & Spending Pattern Analysis (grade from A to F, evaluate savings rate vs benchmarks).
2. ⚠️ Wasteful Spending & Anomaly Check (SDG 12: pinpoint impulsive or disproportionate costs).
3. 📚 Financial Literacy Masterclass Tip (SDG 4: explain one high-value concept simply, like 50/30/20 rule, sinking funds, or compounding).
4. 🚀 Actionable Savings & Growth Plan (SDG 8: give 3 concrete, realistic steps with estimated monetary savings).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      isLiveAI: true,
      insights: response.text || 'Unable to generate analysis at this time.',
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ success: false, message: 'AI Analysis error: ' + error.message });
  }
});

// Interactive AI Chat (User-scoped)
app.post('/api/ai/chat', protect, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question cannot be empty' });
    }

    const userId = req.user._id.toString();
    let userTransactions = isDbConnected
      ? await Expense.find({ user: req.user._id })
      : memoryExpenses.filter((item) => item.user === userId);

    let income = 0;
    let expense = 0;
    userTransactions.forEach((tx) => {
      if (tx.type === 'income') income += Number(tx.amount) || 0;
      else expense += Number(tx.amount) || 0;
    });

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        isLiveAI: false,
        reply: `> **Advisor Note:** Live Gemini AI key is pending in \`.env\`.
        
To answer your question: "${question.trim()}"
1. Maintain at least 3-6 months of living expenses in an emergency fund.
2. Follow the 50/30/20 budgeting rule (Needs / Wants / Savings).
3. Prioritize high-interest debt clearance and mindful consumption (SDG 12).
4. Provide \`GEMINI_API_KEY\` in \`.env\` for live contextual AI guidance!`,
      });
    }

    const prompt = `You are the private AI financial advisor for ${req.user.name} on SpendWise AI (Group 18).
Current Snapshot for ${req.user.name}:
- Inflow: ₹${income}
- Outflow: ₹${expense}
- Net Balance: ₹${income - expense}
- Transaction Count: ${userTransactions.length}

User Question: "${question.trim()}"

Provide a concise, practical, highly encouraging answer adhering to SDG 4 (Education), SDG 8 (Growth), and SDG 12 (Mindful Spending). Use clean Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      isLiveAI: true,
      reply: response.text,
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SpendWise AI - Multi-User Edition (Group 18)`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📊 Storage: ${isDbConnected ? 'MongoDB' : 'In-Memory Multi-Tenant Store'}`);
  console.log(`🤖 AI Engine: Google Gemini 2.5 Flash (@google/genai)`);
  console.log(`=======================================================`);
});
