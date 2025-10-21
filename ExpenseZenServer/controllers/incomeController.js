const Income = require('../models/Income');

// @desc    Add new income
// @route   POST /api/income
// @access  Private
const addIncome = async (req, res) => {
  try {
    const { source, amount, date, notes, category } = req.body;

    const income = await Income.create({
      user: req.user._id,
      source,
      amount,
      date: date || Date.now(),
      notes,
      category: category || 'Other'
    });

    res.status(201).json({
      success: true,
      message: 'Income added successfully',
      data: income
    });
  } catch (error) {
    console.error('Add Income Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding income',
      error: error.message
    });
  }
};

// @desc    Get all user incomes
// @route   GET /api/income
// @access  Private
const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ user: req.user._id })
      .sort({ date: -1 });

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    
    const categoryTotals = incomes.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + inc.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        incomes,
        summary: {
          total: totalIncome,
          count: incomes.length,
          byCategory: categoryTotals
        }
      }
    });
  } catch (error) {
    console.error('Get Incomes Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching incomes',
      error: error.message
    });
  }
};

// @desc    Delete income
// @route   DELETE /api/income/:id
// @access  Private
const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!income) {
      return res.status(404).json({ 
        success: false, 
        message: 'Income not found' 
      });
    }

    await income.deleteOne();

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Delete Income Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting income',
      error: error.message
    });
  }
};

module.exports = {
  addIncome,
  getIncomes,
  deleteIncome
};