// controllers/loanController.js
const Loan = require("../models/Loan");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Notification = require("../models/Notification");

// ADD LOAN — FINAL 100% WORKING (NO TRANSACTIONS)
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
    const amount = Number(rawAmount);
    const interestRate = Number(rawRate);

    // VALIDATION
    if (!["lending", "borrowing"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be 'lending' or 'borrowing'" });
    }
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be a positive number" });
    }
    if (isNaN(interestRate) || interestRate < 0) {
      return res.status(400).json({ success: false, message: "Interest rate must be >= 0" });
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }
    if (due <= start) {
      return res.status(400).json({ success: false, message: "Due date must be after start date" });
    }

    // CALCULATE MONTHS
    let months = (due.getFullYear() - start.getFullYear()) * 12;
    months += due.getMonth() - start.getMonth();
    if (due.getDate() < start.getDate()) months--;
    months = Math.max(1, months);

    const interest = (amount * interestRate * months) / 100;
    const totalInterest = parseFloat(interest.toFixed(2));
    const totalPayable = parseFloat((amount + interest).toFixed(2));

    // CREATE LOAN
    const loan = await Loan.create({
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

    // AUTO EXPENSE (LENDING)
    if (type === "lending") {
      await Expense.create({
        user: userId,
        amount,
        name: `Lent to ${borrowerName}`,
        category: "Lending",  // ← VALID IN Expense enum
        description: `Lent ₹${amount} to ${borrowerName} on ${start.toLocaleDateString("en-IN")}`,
        date: startDate,
      });
    }

    // AUTO INCOME (BORROWING)
    if (type === "borrowing") {
      await Income.create({
        user: userId,
        amount,
        source: `Borrowed from ${lenderName}`,
        category: "Other",  // ← VALID IN Income enum
        date: startDate,
      });
    }

    // NOTIFICATION
    await Notification.create({
      user: userId,
      loan: loan._id,
      title: `Loan Due: ₹${amount}`,
      message: `Due on ${due.toLocaleDateString("en-IN")}`,
      type: "loan_reminder",  // ← VALID IN Notification enum
      dueDate: dueDate,
      reminderDate: dueDate,
    });

    res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Add Loan Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create loan",
    });
  }
};

// GET LOANS
const getLoans = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;
    const query = { user: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const loans = await Loan.find(query)
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Loan.countDocuments(query);

    res.json({
      success: true,
      data: {
        loans,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Loans Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET LOAN BY ID
const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id }).populate("user", "name email");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    res.json({ success: true, data: loan });
  } catch (error) {
    console.error("Get Loan By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE LOAN STATUS (NO TRANSACTION)
const updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    if (!["pending", "paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'pending' or 'paid'" });
    }

    const oldStatus = loan.status;
    loan.status = status;
    if (status === "paid") loan.paidDate = new Date();

    await loan.save();

    // REVERSE IF PAID
    if (status === "paid" && oldStatus !== "paid") {
      if (loan.type === "lending") {
        await Income.create({
          user: loan.user,
          amount: loan.amount + loan.totalInterest,
          source: `Repaid by ${loan.borrowerName}`,
          category: "Other",  // ← VALID IN Income enum
          date: new Date(),
        });
      }
      if (loan.type === "borrowing") {
        await Expense.create({
          user: loan.user,
          amount: loan.amount + loan.totalInterest,
          name: `Paid to ${loan.lenderName}`,
          category: "Repayment",  // ← VALID IN Expense enum
          description: `Repaid loan to ${loan.lenderName}`,
          date: new Date(),
        });
      }
    }

    res.json({ success: true, message: "Status updated", data: loan });
  } catch (error) {
    console.error("Update Loan Status Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE LOAN (NO TRANSACTION)
const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    await Notification.deleteMany({ loan: loan._id });
    await loan.deleteOne();

    res.json({ success: true, message: "Loan deleted successfully" });
  } catch (error) {
    console.error("Delete Loan Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET LOAN STATS
const getLoanStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Loan.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { pending: 0, paid: 0, overdue: 0 };
    stats.forEach((s) => (result[s._id] = s.count));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get Loan Stats Error:", error);
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