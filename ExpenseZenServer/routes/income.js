const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { addIncome, getIncomes, deleteIncome } = require('../controllers/incomeController');
const auth = require('../middleware/auth');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: errors.array()[0].msg 
    });
  }
  next();
};

// @route   POST /api/income
// @desc    Add new income
// @access  Private
router.post('/', auth, [
  body('source').trim().notEmpty().withMessage('Income source is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  validateRequest
], addIncome);

// @route   GET /api/income
// @desc    Get all user incomes
// @access  Private
router.get('/', auth, getIncomes);

// @route   DELETE /api/income/:id
// @desc    Delete income
// @access  Private
router.delete('/:id', auth, deleteIncome);

module.exports = router;