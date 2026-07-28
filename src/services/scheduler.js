const cron = require('node-cron');
const { sendMonthlyReminders } = require('./sms');

function startScheduler() {
  const day = Number(process.env.REMINDER_DAY_OF_MONTH) || 1;

  // Runs every day at 9:00 AM, but only actually sends reminders on the configured day
  cron.schedule('0 9 * * *', async () => {
    const now = new Date();
    if (now.getDate() !== day) return;

    console.log(`[scheduler] Sending monthly payment reminders for ${now.getMonth() + 1}/${now.getFullYear()}...`);
    try {
      const results = await sendMonthlyReminders(now.getFullYear(), now.getMonth() + 1);
      console.log(`[scheduler] Done. ${results.filter(r => r.status === 'sent').length} sent, ${results.filter(r => r.status === 'failed').length} failed.`);
    } catch (err) {
      console.error('[scheduler] Failed to send monthly reminders:', err.message);
    }
  });

  console.log(`[scheduler] Monthly SMS reminders scheduled for day ${day} of each month at 9:00 AM.`);
}

module.exports = { startScheduler };
