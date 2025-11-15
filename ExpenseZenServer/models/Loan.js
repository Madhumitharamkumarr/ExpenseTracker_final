// src/models/Loan.js
const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["lending", "borrowing"],
      required: true,
    },
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
    category: {
      type: String,
      enum: ["Bank", "Friends", "Third Party"],
      default: "Friends",
    },
    notes: String,

    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    paidDate: Date,

    remindersSent: {
      fifteenDays: { type: Boolean, default: false },
      twoDays: { type: Boolean, default: false },
      dueDate: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// FIXED: Convert strings to Date and calculate
loanSchema.pre("save", function (next) {
  const start = new Date(this.startDate);
  const due = new Date(this.dueDate);

  if (isNaN(start) || isNaN(due)) {
    return next(new Error("Invalid startDate or dueDate"));
  }

  const months = Math.max(1, Math.ceil((due - start) / (1000 * 60 * 60 * 24 * 30)));
  const interest = (this.amount * this.interestRate * months) / 100;

  this.totalInterest = parseFloat(interest.toFixed(2));
  this.totalPayable = parseFloat((this.amount + interest).toFixed(2));

  console.log("PRE SAVE: totalPayable =", this.totalPayable); // ← YOU WILL SEE THIS

  next();
});

module.exports = mongoose.model("Loan", loanSchema);