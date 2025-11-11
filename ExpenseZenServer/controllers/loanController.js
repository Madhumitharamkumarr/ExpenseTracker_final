// controllers/loanController.js
const Loan = require("../models/Loan");
const Notification = require("../models/Notification");

// @desc    Add new loan
// @route   POST /api/loans
// @access  Private
const addLoan = async (req, res) => {
  try {
    const {
      type,
      amount,
      interestRate,
      startDate,
      dueDate,
      borrowerName,
      borrowerAddress,
      borrowerPhone,
      lenderName,
      category,
      notes,
    } = req.body;

    // Validate loan type
    if (!["lending", "borrowing"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan type",
      });
    }

    // Create loan object
    const loanData = {
      user: req.user._id,
      type,
      amount,
      interestRate: interestRate || 0,
      startDate: startDate || Date.now(),
      dueDate,
      notes,
    };

    // Add type-specific fields
    if (type === "lending") {
      loanData.borrowerName = borrowerName;
      loanData.borrowerAddress = borrowerAddress;
      loanData.borrowerPhone = borrowerPhone;
    } else {
      loanData.lenderName = lenderName;
      loanData.category = category;
    }

    // Create loan (calculations happen in pre-save hook)
    const loan = await Loan.create(loanData);

    // Create notifications for this loan
    await createLoanNotifications(loan);

    res.status(201).json({
      success: true,
      message: "Loan added successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Add Loan Error:", error);
    return res.status(error.name === "ValidationError" ? 400 : 500).json({
      success: false,
      message:
        error.name === "ValidationError"
          ? "Invalid loan data provided"
          : "Server error while adding loan",
      errors:
        error.name === "ValidationError"
          ? Object.values(error.errors).map((err) => err.message)
          : [error.message],
    });
  }
};

// Helper function to create notifications
const createLoanNotifications = async (loan) => {
  const notifications = [];
  const dueDate = new Date(loan.dueDate);

  // 15 days before
  const fifteenDaysBefore = new Date(dueDate);
  fifteenDaysBefore.setDate(dueDate.getDate() - 15);

  if (fifteenDaysBefore > new Date()) {
    notifications.push({
      user: loan.user,
      loan: loan._id,
      type: "loan_reminder",
      title: `Loan Reminder: 15 days left`,
      message: `Your loan of ₹${loan.amount} is due in 15 days`,
      dueDate: loan.dueDate,
      reminderDate: fifteenDaysBefore,
    });
  }

  // 2 days before
  const twoDaysBefore = new Date(dueDate);
  twoDaysBefore.setDate(dueDate.getDate() - 2);

  if (twoDaysBefore > new Date()) {
    notifications.push({
      user: loan.user,
      loan: loan._id,
      type: "loan_reminder",
      title: `Loan Reminder: 2 days left`,
      message: `Your loan of ₹${loan.amount} is due in 2 days`,
      dueDate: loan.dueDate,
      reminderDate: twoDaysBefore,
    });
  }

  // On due date
  notifications.push({
    user: loan.user,
    loan: loan._id,
    type: "loan_due",
    title: `Loan Due Today`,
    message: `Your loan of ₹${loan.amount} is due today`,
    dueDate: loan.dueDate,
    reminderDate: dueDate,
  });

  await Notification.insertMany(notifications);
};

// @desc    Get all loans
// @route   GET /api/loans
// @access  Private
const getLoans = async (req, res) => {
  try {
    const { type, status } = req.query;

    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const loans = await Loan.find(filter).sort({ dueDate: 1 });

    // Calculate totals
    const totalLending = loans
      .filter((l) => l.type === "lending" && l.status === "pending")
      .reduce((sum, l) => sum + l.totalPayable, 0);

    const totalBorrowing = loans
      .filter((l) => l.type === "borrowing" && l.status === "pending")
      .reduce((sum, l) => sum + l.totalPayable, 0);

    res.json({
      success: true,
      data: {
        loans,
        summary: {
          totalLending,
          totalBorrowing,
          netPosition: totalLending - totalBorrowing,
          count: loans.length,
        },
      },
    });
  } catch (error) {
    console.error("Get Loans Error:", error);
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message:
        error.name === "CastError"
          ? "Invalid query parameters"
          : "Server error while fetching loans",
      errors: [error.message],
    });
  }
};

// @desc    Get single loan
// @route   GET /api/loans/:id
// @access  Private
const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    res.json({
      success: true,
      data: loan,
    });
  } catch (error) {
    console.error("Get Loan Error:", error);
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message:
        error.name === "CastError"
          ? "Invalid loan ID format"
          : "Server error while fetching loan",
      errors: [error.message],
    });
  }
};

// @desc    Update loan status (mark as paid)
// @route   PUT /api/loans/:id/status
// @access  Private
const updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    loan.status = status;
    if (status === "paid") {
      loan.paidDate = Date.now();
    }

    await loan.save();

    res.json({
      success: true,
      message: "Loan status updated successfully",
      data: loan,
    });
  } catch (error) {
    console.error("Update Loan Status Error:", error);
    return res
      .status(
        error.name === "ValidationError" || error.name === "CastError"
          ? 400
          : 500
      )
      .json({
        success: false,
        message:
          error.name === "ValidationError"
            ? "Invalid status value"
            : error.name === "CastError"
            ? "Invalid loan ID format"
            : "Server error while updating loan",
        errors: [error.message],
      });
  }
};

// @desc    Delete loan
// @route   DELETE /api/loans/:id
// @access  Private
const deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    await loan.deleteOne();

    // Delete associated notifications
    await Notification.deleteMany({ loan: loan._id });

    res.json({
      success: true,
      message: "Loan deleted successfully",
    });
  } catch (error) {
    console.error("Delete Loan Error:", error);
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message:
        error.name === "CastError"
          ? "Invalid loan ID format"
          : "Server error while deleting loan",
      errors: [error.message],
    });
  }
};

// @desc    Get loan statistics
// @route   GET /api/loans/stats
// @access  Private
const getLoanStats = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id });

    const stats = {
      lending: {
        total: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        count: 0,
      },
      borrowing: {
        total: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        count: 0,
      },
    };

    loans.forEach((loan) => {
      const type = loan.type;
      stats[type].count++;
      stats[type].total += loan.totalPayable;

      if (loan.status === "pending") stats[type].pending += loan.totalPayable;
      if (loan.status === "paid") stats[type].paid += loan.totalPayable;
      if (loan.status === "overdue") stats[type].overdue += loan.totalPayable;
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get Loan Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching statistics",
      errors: [error.message],
    });
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
