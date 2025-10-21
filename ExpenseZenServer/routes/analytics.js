const express = require('express');
const router = express.Router();
const { 
  getDashboardAnalytics, 
  getChartData, 
  getSuggestions 
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', auth, getDashboardAnalytics);

// @route   GET /api/analytics/charts
// @desc    Get chart data for trends
// @access  Private
router.get('/charts', auth, getChartData);

// @route   GET /api/analytics/suggestions
// @desc    Get smart suggestions
// @access  Private
router.get('/suggestions', auth, getSuggestions);

module.exports = router;