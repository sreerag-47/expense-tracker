const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  targetAmount: { type: Number, required: true, min: 0.01 },
  currentAmount: { type: Number, default: 0, min: 0 },
  deadline: { type: Date },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Goal', GoalSchema);
