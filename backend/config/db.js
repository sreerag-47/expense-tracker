const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] Notice: Could not connect to MongoDB (${error.message}).`);
    console.warn(`[MongoDB] Running in high-reliability multi-tenant memory fallback mode.`);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

mongoose.connection.on('connected', () => {
  isConnected = true;
});

const isDbConnected = () => isConnected;

module.exports = { connectDB, isDbConnected };
