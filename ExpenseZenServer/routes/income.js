// routes/income.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  addIncome,
  getIncomes,
  deleteIncome,
  getTotalIncome,     // ← NEW
  // deductFromIncome    // ← NEW
} = require('../controllers/incomeController');
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

// Existing routes
router.post('/', auth, [
  body('source').trim().notEmpty().withMessage('Income source is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  validateRequest
], addIncome);

router.get('/', auth, getIncomes);
router.delete('/:id', auth, deleteIncome);

// NEW ROUTES
router.get('/total', auth, getTotalIncome);
router.post('/deduct', (req, res) => {
  console.warn(`BLOCKED: /api/income/deduct called by user ${req.user?._id}`);
  return res.status(410).json({
    success: false,
    message: "Deprecated: This API is removed. Update your app!",
    fix: "Remove incomeAPI.deductFromIncome() from AddLendingScreen.js"
  });
});

module.exports = router;