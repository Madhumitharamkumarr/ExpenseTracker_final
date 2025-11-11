// services/cronService.js
const cron = require('node-cron');
const { generateLoanNotifications } = require('./notificationService'); // use your service

// Run every day at 9:00 AM
const scheduleNotificationCheck = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily loan notification check...');

    try {
      // Generate all loan notifications (2 days before, due today, overdue)
      await generateLoanNotifications();

      console.log('Daily loan notification check completed successfully.');
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  console.log('Notification scheduler started.');
};

module.exports = { scheduleNotificationCheck };
