const bcrypt = require('bcryptjs');

const DEMO_PW_HASH = bcrypt.hashSync('demo123', 10);

const memoryUsers = [
  {
    _id: 'user-demo-18',
    id: 'user-demo-18',
    name: 'Sreerag C Madhu',
    email: 'demo@spendwise.ai',
    password: DEMO_PW_HASH,
    currency: 'USD',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'user-shivani-18',
    id: 'user-shivani-18',
    name: 'Shivani Anil',
    email: 'shivani@spendwise.ai',
    password: DEMO_PW_HASH,
    currency: 'USD',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'user-sreya-18',
    id: 'user-sreya-18',
    name: 'Sreya N V',
    email: 'sreya@spendwise.ai',
    password: DEMO_PW_HASH,
    currency: 'USD',
    createdAt: new Date().toISOString(),
  },
];

const memoryTransactions = [
  {
    _id: 'tx-1',
    user: 'user-demo-18',
    title: 'Monthly Tech Salary',
    description: 'Primary compensation deposit',
    amount: 5500,
    type: 'income',
    category: 'Salary',
    date: new Date(Date.now() - 15 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-2',
    user: 'user-demo-18',
    title: 'Apartment Rental Lease',
    description: 'Monthly rental fee',
    amount: 1400,
    type: 'expense',
    category: 'Housing',
    date: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-3',
    user: 'user-demo-18',
    title: 'Supermarket Groceries',
    description: 'Whole foods and pantry supplies',
    amount: 420,
    type: 'expense',
    category: 'Food',
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-4',
    user: 'user-demo-18',
    title: 'Freelance AI Consulting',
    description: 'Automation advisory payout',
    amount: 1500,
    type: 'income',
    category: 'Freelance',
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-5',
    user: 'user-demo-18',
    title: 'Cloud Certification Course',
    description: 'SDG 4 - Skill investment',
    amount: 220,
    type: 'expense',
    category: 'Education',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-6',
    user: 'user-demo-18',
    title: 'Clean Energy & Internet',
    description: 'Utilities billing',
    amount: 210,
    type: 'expense',
    category: 'Utilities',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'tx-7',
    user: 'user-demo-18',
    title: 'Artisan Cafe & Weekend Dining',
    description: 'Social dining with peers',
    amount: 165,
    type: 'expense',
    category: 'Food',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const memoryBudgets = [
  {
    _id: 'b-1',
    user: 'user-demo-18',
    category: 'Housing',
    limit: 1500,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  },
  {
    _id: 'b-2',
    user: 'user-demo-18',
    category: 'Food',
    limit: 650,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  },
  {
    _id: 'b-3',
    user: 'user-demo-18',
    category: 'Utilities',
    limit: 250,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  },
  {
    _id: 'b-4',
    user: 'user-demo-18',
    category: 'Education',
    limit: 300,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  },
];

const memoryGoals = [
  {
    _id: 'g-1',
    user: 'user-demo-18',
    title: 'Emergency Reserve Fund (SDG 8)',
    targetAmount: 5000,
    currentAmount: 3200,
    deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
    status: 'in-progress',
  },
  {
    _id: 'g-2',
    user: 'user-demo-18',
    title: 'AI Dev Workstation Setup',
    targetAmount: 2000,
    currentAmount: 1400,
    deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'in-progress',
  },
];

module.exports = {
  users: memoryUsers,
  transactions: memoryTransactions,
  budgets: memoryBudgets,
  goals: memoryGoals,

  findUserById(id) {
    const u = memoryUsers.find((user) => user._id === id || user.id === id);
    if (!u) return null;
    const { password, ...safeUser } = u;
    return safeUser;
  },

  findUserByEmail(email) {
    return memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  addUser(user) {
    memoryUsers.push(user);
    return user;
  },
};
