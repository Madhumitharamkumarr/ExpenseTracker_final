// routes/loan.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  addLoan,
  getLoans,
  getLoanById,
  updateLoanStatus,
  deleteLoan,
  getLoanStats
} = require('../controllers/loanController');
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

// @route   POST /api/loans
router.post('/', auth, [
  body('type').isIn(['lending', 'borrowing']).withMessage('Invalid loan type'),
  body('amount').isNumeric().isFloat({ min: 0 }).withMessage('Valid amount required'),
  body('interestRate').optional().isNumeric().withMessage('Valid interest rate required'),
  body('dueDate').isISO8601().withMessage('Valid due date required'),
  validateRequest
], addLoan);

// @route   GET /api/loans
router.get('/', auth, getLoans);

// @route   GET /api/loans/stats
router.get('/stats', auth, getLoanStats);

// @route   GET /api/loans/:id
router.get('/:id', auth, getLoanById);

// @route   PUT /api/loans/:id/status
router.put('/:id/status', auth, [
  body('status').isIn(['pending', 'paid', 'overdue']).withMessage('Invalid status'),
  validateRequest
], updateLoanStatus);

// @route   DELETE /api/loans/:id
router.delete('/:id', auth, deleteLoan);

module.exports = router;