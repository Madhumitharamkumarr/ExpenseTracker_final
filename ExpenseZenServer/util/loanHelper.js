// src/util/loanHelper.js
const Income = require("../models/Income");
const Expense = require("../models/Expense");

const createBorrowIncome = async (loan, userId) => {
  try {
    await Income.create({
      user: userId,
      source: `Borrowed from ${loan.lenderName || "Someone"}`,
      amount: loan.amount,
      category: "Other", // CHANGE IF YOU HAVE "Loan" IN ENUM
      date: loan.startDate,
      notes: `Loan ID: ${loan._id} | Due: ${new Date(loan.dueDate).toLocaleDateString()}`,
    });
    console.log("Borrow income created");
  } catch (error) {
    console.error("createBorrowIncome error:", error.message);
  }
};

const createLendingExpense = async (loan, userId) => {
  try {
    await Expense.create({
      user: userId,
      name: `Lent to ${loan.borrowerName || "Someone"}`,
      amount: loan.amount,
      category: "Other", // CHANGE IF YOU HAVE "Lending" IN ENUM
      date: loan.startDate,
      notes: `Loan ID: ${loan._id} | Due: ${new Date(loan.dueDate).toLocaleDateString()}`,
    });
    console.log("Lending expense created");
  } catch (error) {
    console.error("createLendingExpense error:", error.message);
  }
};

module.exports = { createBorrowIncome, createLendingExpense };