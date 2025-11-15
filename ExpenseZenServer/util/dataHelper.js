// src/util/dataHelper.js
// General reusable helpers

const formatCurrency = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN");
};

const getMonthsBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24 * 30)));
};

module.exports = {
  formatCurrency,
  formatDate,
  getMonthsBetween,
};