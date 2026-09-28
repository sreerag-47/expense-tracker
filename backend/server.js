const path = require('path');
// Load environment variables from backend/.env first, then root .env as fallback
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { connectDB, isDbConnected } = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// System Status Endpoint
app.get('/api/status', (req, res) => {
  const aiHelper = require('./utils/aiHelper');
  const currentKey = aiHelper.getApiKey();
  const hasKey = Boolean(currentKey && currentKey.length > 10 && currentKey !== 'your_gemini_api_key_here');

  res.json({
    status: 'online',
    mongoConnected: isDbConnected(),
    aiConfigured: hasKey,
    storageMode: isDbConnected() ? 'MongoDB Cluster' : 'In-Memory Store (Multi-User)',
    version: '2.0.0',
    group: 'Group 18',
    team: ['Shivani Anil (51)', 'Sreerag C Madhu (52)', 'Sreya N V (53)'],
  });
});

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback routing for multi-page frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Expense Tracker Server (Group 18)`);
  console.log(`🌐 Running on: http://localhost:${PORT}`);
  console.log(`📊 Storage: ${isDbConnected() ? 'MongoDB Live' : 'In-Memory Fallback'}`);
  console.log(`🤖 AI Engine: Google Gemini 2.5 Flash / Anomaly Detector`);
  console.log(`=======================================================`);
});
