// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
  type: { 
    type: String, 
    enum: ['loan_reminder', 'loan_due', 'general', 'reminder'], // ← ADDED 'reminder'
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  dueDate: { type: Date },       // Loan due date
  reminderDate: { type: Date }   // Date when notification should be sent/displayed
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);