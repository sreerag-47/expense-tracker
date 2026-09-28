const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title or description'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Please specify an amount'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    type: {
      type: String,
      required: [true, 'Please specify transaction type (income or expense)'],
      enum: {
        values: ['income', 'expense'],
        message: '{VALUE} is not a valid transaction type',
      },
      default: 'expense',
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: [true, 'Please provide a transaction date'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast query by user, date, and type
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, type: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
