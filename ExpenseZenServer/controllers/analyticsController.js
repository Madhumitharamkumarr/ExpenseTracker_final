const Expense = require('../models/Expense');
const Income = require('../models/Income');

// Helper function to get date range
const getDateRange = (period) => {
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'year') {
    startDate.setFullYear(now.getFullYear() - 1);
  }
  
  return { startDate, endDate: now };
};

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all incomes and expenses
    const [incomes, expenses] = await Promise.all([
      Income.find({ user: userId }),
      Expense.find({ user: userId })
    ]);

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = totalIncome - totalExpenses;

    // Get this week's data
    const weekRange = getDateRange('week');
    const weekIncomes = incomes.filter(inc => new Date(inc.date) >= weekRange.startDate);
    const weekExpenses = expenses.filter(exp => new Date(exp.date) >= weekRange.startDate);
    
    const weekIncome = weekIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const weekExpense = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Get last week's data for comparison
    const lastWeekStart = new Date(weekRange.startDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= lastWeekStart && expDate < weekRange.startDate;
    });
    const lastWeekExpense = lastWeekExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate savings compared to last week
    const weeklySavings = lastWeekExpense - weekExpense;

    // Category breakdown
    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance,
        weekIncome,
        weekExpense,
        weeklySavings,
        expensesByCategory,
        incomeCount: incomes.length,
        expenseCount: expenses.length
      }
    });
  } catch (error) {
    console.error('Dashboard Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching analytics',
      error: error.message
    });
  }
};

// @desc    Get chart data for weekly/monthly trends
// @route   GET /api/analytics/charts
// @access  Private
const getChartData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'week' } = req.query; // 'week' or 'month'

    const range = getDateRange(period);
    
    const [incomes, expenses] = await Promise.all([
      Income.find({ 
        user: userId,
        date: { $gte: range.startDate, $lte: range.endDate }
      }).sort({ date: 1 }),
      Expense.find({ 
        user: userId,
        date: { $gte: range.startDate, $lte: range.endDate }
      }).sort({ date: 1 })
    ]);

    // Group by day for week, by week for month
    const groupData = (items, isWeek) => {
      const grouped = {};
      
      items.forEach(item => {
        const date = new Date(item.date);
        let key;
        
        if (isWeek) {
          key = date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
          const weekNum = Math.ceil(date.getDate() / 7);
          key = `Week ${weekNum}`;
        }
        
        grouped[key] = (grouped[key] || 0) + item.amount;
      });
      
      return grouped;
    };

    const isWeek = period === 'week';
    const incomeData = groupData(incomes, isWeek);
    const expenseData = groupData(expenses, isWeek);

    // Generate labels
    const labels = isWeek 
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const chartData = {
      labels,
      income: labels.map(label => incomeData[label] || 0),
      expenses: labels.map(label => expenseData[label] || 0)
    };

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Chart Data Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching chart data',
      error: error.message
    });
  }
};

// @desc    Get smart suggestions based on spending patterns
// @route   GET /api/analytics/suggestions
// @access  Private
const getSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    const [incomes, expenses] = await Promise.all([
      Income.find({ user: userId }),
      Expense.find({ user: userId })
    ]);

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Category breakdown
    const categoryExpenses = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const suggestions = [];
    const motivations = [];

    // Generate suggestions based on spending patterns
    if (totalIncome > 0) {
      Object.entries(categoryExpenses).forEach(([category, amount]) => {
        const percentage = (amount / totalIncome) * 100;
        
        if (percentage > 30) {
          suggestions.push({
            type: 'warning',
            category,
            message: `You spent ${percentage.toFixed(0)}% of your income on ${category}. Consider reducing it to save more.`,
            icon: '⚠️'
          });
        } else if (percentage > 20) {
          suggestions.push({
            type: 'info',
            category,
            message: `${category} expenses are ${percentage.toFixed(0)}% of your income. Keep an eye on this.`,
            icon: 'ℹ️'
          });
        }
      });
    }

    // Check for savings
    const balance = totalIncome - totalExpenses;
    if (balance > 0) {
      const savingsRate = (balance / totalIncome) * 100;
      motivations.push({
        type: 'success',
        message: `Great job! You saved ₹${balance.toFixed(2)} (${savingsRate.toFixed(0)}% of your income) 🎉`,
        icon: '🎉'
      });
    }

    // Weekly comparison
    const weekRange = getDateRange('week');
    const weekExpenses = expenses.filter(exp => new Date(exp.date) >= weekRange.startDate);
    const weekTotal = weekExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const lastWeekStart = new Date(weekRange.startDate);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= lastWeekStart && expDate < weekRange.startDate;
    });
    const lastWeekTotal = lastWeekExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (lastWeekTotal > 0 && weekTotal < lastWeekTotal) {
      const saved = lastWeekTotal - weekTotal;
      motivations.push({
        type: 'success',
        message: `Awesome! You saved ₹${saved.toFixed(2)} this week compared to last week! Keep it up! 🌟`,
        icon: '🌟'
      });
    }

    // Add general tips if no specific issues
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'success',
        category: 'Overall',
        message: 'Your spending looks healthy! Keep tracking regularly.',
        icon: '✅'
      });
    }

    res.json({
      success: true,
      data: {
        suggestions,
        motivations,
        summary: {
          totalIncome,
          totalExpenses,
          balance,
          savingsRate: totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0
        }
      }
    });
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while generating suggestions',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardAnalytics,
  getChartData,
  getSuggestions
};