const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { signup, signin, getProfile } = require('../controllers/authController');
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

// @route   POST /api/auth/signup
// @desc    Register new user
// @access  Public
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validateRequest
], signup);

// @route   POST /api/auth/signin
// @desc    Authenticate user & get token
// @access  Public
router.post('/signin', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
], signin);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

module.exports = router;