// src/controllers/analyticsController.js
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');

const getDateRange = (period) => {
  const now = new Date();
  const startDate = new Date();
  if (period === 'week') startDate.setDate(now.getDate() - 7);
  else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
  else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
  return { startDate, endDate: now };
};

const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const [incomes, expenses] = await Promise.all([
      Income.find({ user: userId }),
      Expense.find({ user: userId })
    ]);

    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpenses;

    const weekRange = getDateRange('week');
    const weekIncomes = incomes.filter(i => new Date(i.date) >= weekRange.startDate);
    const weekExpenses = expenses.filter(e => new Date(e.date) >= weekRange.startDate);
    const weekIncome = weekIncomes.reduce((s, i) => s + i.amount, 0);
    const weekExpense = weekExpenses.reduce((s, e) => s + e.amount, 0);

    const lastWeekStart = new Date(weekRange.startDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= lastWeekStart && d < weekRange.startDate;
    });
    const lastWeekExpense = lastWeekExpenses.reduce((s, e) => s + e.amount, 0);
    const weeklySavings = lastWeekExpense - weekExpense;

    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    res.json({
      success: true,
      data: {
        totalIncome, totalExpenses, balance, weekIncome, weekExpense,
        weeklySavings, expensesByCategory,
        incomeCount: incomes.length, expenseCount: expenses.length,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Dashboard Analytics Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getChartData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'week' } = req.query;
    const range = getDateRange(period);
    const [incomes, expenses] = await Promise.all([
      Income.find({ user: userId, date: { $gte: range.startDate, $lte: range.endDate } }).sort({ date: 1 }),
      Expense.find({ user: userId, date: { $gte: range.startDate, $lte: range.endDate } }).sort({ date: 1 })
    ]);

    const groupData = (items, isWeek) => {
      const grouped = {};
      items.forEach(item => {
        const d = new Date(item.date);
        const key = isWeek ? d.toLocaleDateString('en-US', { weekday: 'short' }) : `Week ${Math.ceil(d.getDate() / 7)}`;
        grouped[key] = (grouped[key] || 0) + item.amount;
      });
      return grouped;
    };

    const isWeek = period === 'week';
    const incomeData = groupData(incomes, isWeek);
    const expenseData = groupData(expenses, isWeek);
    const labels = isWeek ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    res.json({
      success: true,
      data: { labels, income: labels.map(l => incomeData[l] || 0), expenses: labels.map(l => expenseData[l] || 0) }
    });
  } catch (error) {
    console.error('Chart Data Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    const [incomes, expenses] = await Promise.all([
      Income.find({ user: userId }),
      Expense.find({ user: userId })
    ]);

    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const categoryExpenses = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const suggestions = [];
    if (totalIncome > 0) {
      Object.entries(categoryExpenses).forEach(([cat, amt]) => {
        const pct = (amt / totalIncome) * 100;
        if (pct > 30) suggestions.push({ type: 'warning', category: cat, message: `You spent ${pct.toFixed(0)}% on ${cat}. Reduce it!`, icon: 'Warning' });
        else if (pct > 20) suggestions.push({ type: 'info', category: cat, message: `${cat} is ${pct.toFixed(0)}% of income. Watch it.`, icon: 'Info' });
      });
    }

    const balance = totalIncome - totalExpenses;
    const motivations = [];
    if (balance > 0) {
      const rate = (balance / totalIncome) * 100;
      motivations.push({ type: 'success', message: `Saved ₹${balance.toFixed(2)} (${rate.toFixed(0)}%) Success`, icon: 'Success' });
    }

    if (suggestions.length === 0) {
      suggestions.push({ type: 'success', category: 'Overall', message: 'Healthy spending! Keep tracking.', icon: 'Check' });
    }

    res.json({
      success: true,
      data: { suggestions, motivations, summary: { totalIncome, totalExpenses, balance, savingsRate: totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0 } }
    });
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAvailableBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const [incomeRes, expenseRes, lendingRes] = await Promise.all([
      Income.aggregate([{ $match: { user: userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { user: userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Loan.aggregate([{ $match: { user: userId, type: "lending", status: "pending" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);

    const totalIncome = incomeRes[0]?.total || 0;
    const totalExpenses = expenseRes[0]?.total || 0;
    const totalLentOut = lendingRes[0]?.total || 0;
    const available = totalIncome - totalExpenses - totalLentOut;

    res.json({ success: true, availableBalance: Math.max(0, available) });
  } catch (error) {
    console.error("Get Available Balance Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getDashboardAnalytics,
  getChartData,
  getSuggestions,
  getAvailableBalance
};