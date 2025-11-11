// models/Loan.js
const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['lending', 'borrowing'], required: true },
  amount: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  borrowerName: { type: String },   // For lending
  borrowerAddress: { type: String }, // For lending
  borrowerPhone: { type: String },   // For lending
  lenderName: { type: String },      // For borrowing
  category: { type: String },        // For borrowing
  notes: { type: String },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paidDate: { type: Date },
  totalPayable: { type: Number } // amount + interest
}, {
  timestamps: true
});

// Pre-save hook to calculate totalPayable
loanSchema.pre('save', function(next) {
  if (this.interestRate && this.amount) {
    this.totalPayable = this.amount + (this.amount * this.interestRate) / 100;
  } else {
    this.totalPayable = this.amount;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
