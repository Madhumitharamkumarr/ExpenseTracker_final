// src/util/loanHelper.js
const Income = require("../models/Income");
const Expense = require("../models/Expense");

const createBorrowIncome = async (loan, userId) => {
  try {
    await Income.create({
      user: userId,
      source: `Borrowed from ${loan.lenderName || "Someone"}`, // source, not title
      amount: loan.amount,
      category: "Other", // "Loan" not in enum → use "Other"
      date: loan.startDate,
      notes: `Loan ID: ${loan._id} | Due: ${new Date(loan.dueDate).toLocaleDateString()}`,
    });
  } catch (error) {
    console.error("createBorrowIncome error:", error.message);
  }
};

const createLendingExpense = async (loan, userId) => {
  try {
    await Expense.create({
      user: userId,
      name: `Lent to ${loan.borrowerName || "Someone"}`, // name, not title
      amount: loan.amount,
      category: "Other", // "Loan Given" NOT in enum → use "Other"
      date: loan.startDate,
      notes: `Loan ID: ${loan._id} | Due: ${new Date(loan.dueDate).toLocaleDateString()}`,
    });
  } catch (error) {
    console.error("createLendingExpense error:", error.message);
  }
};

module.exports = {
  createBorrowIncome,
  createLendingExpense,
};