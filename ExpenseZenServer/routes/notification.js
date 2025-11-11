// routes/notification.js
const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// @route   GET /api/notifications
router.get('/', auth, getNotifications);

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', auth, markAsRead);

// @route   PUT /api/notifications/read-all
router.put('/read-all', auth, markAllAsRead);

module.exports = router;