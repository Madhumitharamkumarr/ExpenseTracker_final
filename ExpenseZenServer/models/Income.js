// models/Income.js
const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    required: [true, 'Income source is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  date: {
    type: Date,
    default: Date.now  // ← DEFAULT TODAY
    // removed 'required' → optional
  },
  notes: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Salary', 'Freelance', 'Investment', 'Business', 'Gift', 'Other'],
    default: 'Other'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Income', incomeSchema);