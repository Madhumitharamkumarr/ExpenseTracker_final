// services/notificationService.js — FINAL FIXED VERSION
const Notification = require("../models/Notification");
const Loan = require("../models/Loan");

async function createNotification(userId, loanId, type, title, message, dueDate, reminderDate) {
  const existing = await Notification.findOne({ loan: loanId, type, reminderDate: reminderDate || null });
  if (existing) return existing;

  const notification = new Notification({
    user: userId,
    loan: loanId,
    type,
    title,
    message,
    dueDate,
    reminderDate,
    isRead: false
  });

  await notification.save();
  return notification;
}

async function generateLoanNotifications() {
  const loans = await Loan.find({ status: { $ne: "paid" } });
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (const loan of loans) {
    const due = new Date(loan.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));

    // 15 days before
    if (diffDays === 15) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_reminder",
        "Loan Due in 15 Days",
        `₹${loan.amount} loan due on ${due.toLocaleDateString('en-IN')}`,
        loan.dueDate,
        new Date(due)
      );
    }

    // 2 days before
    if (diffDays === 2) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_reminder",
        "Loan Due in 2 Days",
        `₹${loan.amount} loan due soon!`,
        loan.dueDate,
        new Date(due)
      );
    }

    // Due today
    if (diffDays === 0) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_due",
        "Loan Due Today",
        `₹${loan.amount} is due TODAY!`,
        loan.dueDate,
        null
      );
    }

    // Overdue
    if (diffDays < 0 && loan.status !== "overdue") {
      await createNotification(
        loan.user,
        loan._id,
        "loan_overdue",
        "Loan Overdue",
        `₹${loan.amount} was due on ${due.toLocaleDateString('en-IN')}`,
        loan.dueDate,
        null
      );
      loan.status = "overdue";
      await loan.save();
    }
  }
}

module.exports = { generateLoanNotifications };