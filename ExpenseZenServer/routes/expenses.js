const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// @route   POST /api/expenses
// @desc    Add new expense
// @access  Private
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Expense name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: errors.array()[0].msg 
      });
    }

    const { name, category, amount, date, notes } = req.body;

    const expense = await Expense.create({
      user: req.user._id,
      name,
      category,
      amount,
      date: date || Date.now(),
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      data: expense
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while adding expense' 
    });
  }
});

// @route   GET /api/expenses
// @desc    Get all user expenses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 });

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Group by category
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        expenses,
        summary: {
          total: totalExpenses,
          count: expenses.length,
          byCategory: categoryTotals
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching expenses' 
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!expense) {
      return res.status(404).json({ 
        success: false, 
        message: 'Expense not found' 
      });
    }

    await expense.deleteOne();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting expense' 
    });
  }
});

module.exports = router;