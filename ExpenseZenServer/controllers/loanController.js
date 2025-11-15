// controllers/loanController.js
const Loan = require("../models/Loan");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Notification = require("../models/Notification");

// ADD LOAN — FINAL UPGRADED
const addLoan = async (req, res) => {
  const session = await Loan.startSession();
  session.startTransaction();

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
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be positive" });
    }

    if (isNaN(interestRate) || interestRate < 0) {
      return res.status(400).json({ success: false, message: "Invalid interest rate" });
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);
    if (isNaN(start) || isNaN(due) || due <= start) {
      return res.status(400).json({ success: false, message: "Invalid dates" });
    }

    // CREATE LOAN
    const loan = await Loan.create([{
      user: userId,
      type,
      amount,
      interestRate,
      startDate,
      dueDate,
      borrowerName: type === "lending" ? borrowerName : undefined,
      borrowerAddress: type === "lending" ? borrowerAddress : undefined,
      borrowerPhone: type === "lending" ? borrowerPhone : undefined,
      lenderName: type === "borrowing" ? lenderName : undefined,
      category: type === "borrowing" ? category : undefined,
      notes,
    }], { session })[0];

    // AUTO INCOME/EXPENSE (ATOMIC)
    if (type === "borrowing") {
      await Income.create([{
        user: userId,
        amount,
        source: `Borrowed from ${lenderName}`,
        category: "Borrowing",
        date: startDate,
      }], { session });
    }

    if (type === "lending") {
      await Expense.create([{
        user: userId,
        amount,
        category: "Lending",
        description: `Lent to ${borrowerName}`,
        date: startDate,
      }], { session });
    }

    // NOTIFICATION
    await Notification.create([{
      user: userId,
      loan: loan._id,
      title: `Loan Due: ₹${amount}`,
      message: `Due on ${due.toLocaleDateString("en-IN")}`,
      type: "reminder",
      notifyDate: dueDate,
    }], { session });

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: "Loan created successfully",
      data: loan,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Add Loan Error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    session.endSession();
  }
};

// GET LOANS — WITH FILTER & PAGINATION
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
      data: { loans, total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET LOAN BY ID — POPULATE USER
const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id }).populate("user", "name email");
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE STATUS — WITH INCOME/EXPENSE REVERSE
const updateLoanStatus = async (req, res) => {
  const session = await Loan.startSession();
  session.startTransaction();

  try {
    const { status } = req.body;
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    if (!["pending", "paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const oldStatus = loan.status;
    loan.status = status;
    if (status === "paid") loan.paidDate = new Date();

    await loan.save({ session });

    // REVERSE IF PAID (OPTIONAL)
    if (status === "paid" && oldStatus !== "paid") {
      if (loan.type === "lending") {
        await Income.create([{
          user: loan.user,
          amount: loan.amount + loan.totalInterest,
          source: `Repaid by ${loan.borrowerName}`,
          category: "Repayment",
          date: new Date(),
        }], { session });
      }
      if (loan.type === "borrowing") {
        await Expense.create([{
          user: loan.user,
          amount: loan.amount + loan.totalInterest,
          category: "Repayment",
          description: `Paid to ${loan.lenderName}`,
          date: new Date(),
        }], { session });
      }
    }

    await session.commitTransaction();
    res.json({ success: true, message: "Status updated", data: loan });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    session.endSession();
  }
};

// DELETE LOAN — WITH CLEANUP
const deleteLoan = async (req, res) => {
  const session = await Loan.startSession();
  session.startTransaction();

  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user.id });
    if (!loan) return res.status(404).json({ success: false, message: "Loan not found" });

    await Notification.deleteMany({ loan: loan._id }, { session });
    await loan.deleteOne({ session });

    await session.commitTransaction();
    res.json({ success: true, message: "Loan deleted" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    session.endSession();
  }
};
// GET LOAN STATS — FIXED
const getLoanStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await Loan.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { pending: 0, paid: 0, overdue: 0 }; // ← FIXED: "uppe" → "overdue"
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