// services/notificationService.js
const Notification = require("../models/Notification");
const Loan = require("../models/Loan");

/**
 * Creates a notification if one doesn’t already exist for the same loan and type.
 */
async function createNotification(
  userId,
  loanId,
  type,
  title,
  message,
  dueDate,
  reminderDate
) {
  const existing = await Notification.findOne({ loan: loanId, type });
  if (existing) return existing;

  const notification = new Notification({
    user: userId,
    loan: loanId,
    type,
    title,
    message,
    dueDate,
    reminderDate,
  });

  await notification.save();
  return notification;
}

/**
 * Automatically generates notifications based on loan due dates.
 * Called daily by cron.
 */
async function generateLoanNotifications() {
  const loans = await Loan.find({});

  const now = new Date();
  const twoDaysBefore = new Date(now);
  twoDaysBefore.setDate(now.getDate() + 2);

  for (const loan of loans) {
    if (loan.status === "paid") continue;

    // Reminder 2 days before due
    if (loan.dueDate && loan.dueDate.toDateString() === twoDaysBefore.toDateString()) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_reminder",
        "⏰ Loan Due Soon",
        `Your loan of ₹${loan.amount} is due in 2 days.`,
        loan.dueDate,
        twoDaysBefore
      );
    }

    // On due date
    if (loan.dueDate && loan.dueDate.toDateString() === now.toDateString()) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_due",
        "📅 Loan Due Today",
        `Your loan of ₹${loan.amount} is due today.`,
        loan.dueDate,
        null
      );
    }

    // Overdue
    if (loan.dueDate && loan.dueDate < now) {
      await createNotification(
        loan.user,
        loan._id,
        "loan_overdue",
        "⚠️ Loan Overdue",
        `Your loan of ₹${loan.amount} was due on ${loan.dueDate.toDateString()}. Please repay soon.`,
        loan.dueDate,
        null
      );

      // Optionally update loan status to overdue
      if (loan.status !== "overdue") {
        loan.status = "overdue";
        await loan.save();
      }
    }
  }
}

module.exports = {
  createNotification,
  generateLoanNotifications
};
