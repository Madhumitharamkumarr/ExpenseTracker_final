// models/Loan.js
const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["lending", "borrowing"], required: true },
    amount: { type: Number, required: true },
    interestRate: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },

    totalInterest: { type: Number, default: 0 },
    totalPayable: { type: Number, required: true },

    borrowerName: String,
    borrowerAddress: String,
    borrowerPhone: String,

    lenderName: String,
    category: { type: String, enum: ["Bank", "Friends", "Third Party"], default: "Friends" },
    notes: String,

    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    paidDate: Date,

    remindersSent: {
      fifteenDays: { type: Boolean, default: false },
      twoDays: { type: Boolean, default: false },
      dueDate: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// CORRECT MONTH CALC
loanSchema.pre("save", function (next) {
  const start = new Date(this.startDate);
  const due = new Date(this.dueDate);

  if (isNaN(start.getTime()) || isNaN(due.getTime())) {
    return next(new Error("Invalid date"));
  }

  let months = (due.getFullYear() - start.getFullYear()) * 12;
  months += due.getMonth() - start.getMonth();
  if (due.getDate() < start.getDate()) months--;
  months = Math.max(1, months);

  const interest = (this.amount * this.interestRate * months) / 100;
  this.totalInterest = parseFloat(interest.toFixed(2));
  this.totalPayable = parseFloat((this.amount + interest).toFixed(2));

  next();
});

module.exports = mongoose.model("Loan", loanSchema);