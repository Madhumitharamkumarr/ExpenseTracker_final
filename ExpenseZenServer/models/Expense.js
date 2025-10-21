const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Expense name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Food', 'Travel', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'],
    default: 'Other'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);