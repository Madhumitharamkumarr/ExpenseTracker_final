// src/controllers/loanController.js
const Loan = require("../models/Loan");
const Notification = require("../models/Notification");
const { createBorrowIncome, createLendingExpense } = require("../util/loanHelper");

// ADD LOAN — FINAL, BULLETPROOF, NO-BUG VERSION
const addLoan = async (req, res) => {
  try {
    const {
      type,
      amount: rawAmount,
      interestRate: rawRate = 0,
      startDate,
      dueDate,
      borrowerName,
      borrowerAddress,
      borrowerPhone,
      lenderName,
      category,
      notes,
    } = req.body;

    const userId = req.user.id;

    // CONVERT TO NUMBER — CRITICAL FIX
    const amount = Number(rawAmount);
    const interestRate = Number(rawRate);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    if (isNaN(interestRate) || interestRate < 0) {
      return res.status(400).json({
        success: false,
        message: "Interest rate must be a valid number",
      });
    }

    if (!["lending", "borrowing"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be 'lending' or 'borrowing'",
      });
    }

    if (!startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and dueDate are required",
      });
    }

    // DATE CONVERSION
    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start) || isNaN(due)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // CALCULATE INTEREST & TOTAL PAYABLE
    const months = Math.max(1, Math.ceil((due - start) / (1000 * 60 * 60 * 24 * 30)));
    const interest = (amount * interestRate * months) / 100;
    const totalInterest = parseFloat(interest.toFixed(2));
    const totalPayable = parseFloat((amount + interest).toFixed(2));

    console.log("CALCULATED → amount:", amount, "rate:", interestRate, "months:", months, "totalPayable:", totalPayable);

    // CREATE LOAN DOCUMENT
    const loan = new Loan({
      user: userId,
      type,
      amount,
      interestRate,
      startDate,
      dueDate,
      totalInterest,
      totalPayable,
      borrowerName: type === "lending" ? borrowerName : undefined,
      borrowerAddress: type === "lending" ? borrowerAddress : undefined,
      borrowerPhone: type === "lending" ? borrowerPhone : undefined,
      lenderName: type === "borrowing" ? lenderName : undefined,
      category: type === "borrowing" ? category : undefined,
      notes,
    });

    await loan.save();

    // AUTO-CREATE INCOME / EXPENSE
    if (type === "borrowing") await createBorrowIncome(loan, userId);
    if (type === "lending") await createLendingExpense(loan, userId);

    // AUTO-CREATE NOTIFICATION — ONLY THIS BLOCK MODIFIED
    try {
      await Notification.create({
        user: userId,
        loan: loan._id,
        title: `Loan Due: ₹${loan.amount}`,
        message: `Due on ${new Date(loan.dueDate).toLocaleDateString()}`, // REQUIRED
        type: "general",
        notifyDate: loan.dueDate,
      });
    } catch (error) {
      console.error("Notification create error:", error.message);
      // Don't fail loan creation
    }

    res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Add Loan Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL LOANS
const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id }).sort({ dueDate: 1 });
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET LOAN BY ID
const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE LOAN STATUS (pending to paid)
const updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be pending or paid" });
    }

    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    loan.status = status;
    if (status === "paid") loan.paidDate = new Date();
    await loan.save();

    res.json({ success: true, message: "Status updated", data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE LOAN
const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    await Notification.deleteMany({ loan: loan._id });
    await loan.deleteOne();

    res.json({ success: true, message: "Loan deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET LOAN STATS
const getLoanStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Loan.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { pending: 0, paid: 0,uppe: 0 };
    stats.forEach((s) => (result[s._id] = s.count));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  addLoan,
  getLoans,
  getLoanById,
  updateLoanStatus,
  deleteLoan,
  getLoanStats,
};