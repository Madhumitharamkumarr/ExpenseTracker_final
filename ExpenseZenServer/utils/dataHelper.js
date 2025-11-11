// util/dataHelper.js

/**
 * Calculate total payable amount with interest
 * @param {number} amount - Principal amount
 * @param {number} interestRate - Interest rate in %
 * @returns {number} total payable
 */
function calculateTotalPayable(amount, interestRate = 0) {
  return amount + (amount * interestRate) / 100;
}

/**
 * Check if a loan is overdue
 * @param {Date} dueDate
 * @returns {boolean}
 */
function isOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Get notification dates for a loan
 * @param {Date} dueDate
 * @returns {object} dates for reminders
 */
function getNotificationDates(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fifteenDaysBefore = new Date(dueDate);
  fifteenDaysBefore.setDate(dueDate.getDate() - 15);

  const twoDaysBefore = new Date(dueDate);
  twoDaysBefore.setDate(dueDate.getDate() - 2);

  const isFifteenDaysBeforeValid = fifteenDaysBefore > today;
  const isTwoDaysBeforeValid = twoDaysBefore > today;
  const isDueToday = dueDate.toDateString() === today.toDateString();

  return {
    fifteenDaysBefore: isFifteenDaysBeforeValid ? fifteenDaysBefore : null,
    twoDaysBefore: isTwoDaysBeforeValid ? twoDaysBefore : null,
    dueToday: isDueToday ? today : null,
  };
}

/**
 * Format a Date object to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

/**
 * Format number as currency (₹)
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

module.exports = {
  calculateTotalPayable,
  isOverdue,
  getNotificationDates,
  formatDate,
  formatCurrency,
};
