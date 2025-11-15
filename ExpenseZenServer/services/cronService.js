// services/cronService.js
const cron = require('node-cron');
const { generateLoanNotifications } = require('./notificationService');

const startScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily loan reminders (9 AM IST)...');
    try {
      await generateLoanNotifications();
      console.log('Reminders generated');
    } catch (err) {
      console.error('Cron error:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log('Cron started: 9 AM IST');
};

// AUTO-START
startScheduler();

module.exports = { startScheduler };