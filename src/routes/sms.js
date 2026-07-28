const express = require('express');
const { readDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendMonthlyReminders, sendSms, reminderText } = require('../services/sms');

const router = express.Router();
router.use(requireAuth);

// Send reminders right now to every unpaid member for the given (or current) month
router.post('/send-reminders', async (req, res) => {
  const now = new Date();
  const year = Number(req.body.year) || now.getFullYear();
  const month = Number(req.body.month) || now.getMonth() + 1;

  try {
    const results = await sendMonthlyReminders(year, month);
    res.json({ results, year, month });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a one-off SMS to a single member
router.post('/send-one/:memberId', async (req, res) => {
  const state = readDb();
  const member = state.members.find((m) => m.id === Number(req.params.memberId));
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const now = new Date();
  const body = req.body.message || reminderText(member, now.getFullYear(), now.getMonth() + 1);

  try {
    await sendSms(member.phone, body, member.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent SMS activity log
router.get('/log', (req, res) => {
  const state = readDb();
  const log = [...state.sms_log]
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
    .slice(0, 100);
  res.json({ log });
});

module.exports = router;
