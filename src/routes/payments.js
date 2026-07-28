const express = require('express');
const { readDb, writeDb, getNextId } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Mark a member's payment for a given month as paid or unpaid
router.post('/mark', (req, res) => {
  const { member_id, year, month, paid, amount } = req.body;
  if (!member_id || !year || !month) {
    return res.status(400).json({ error: 'member_id, year and month are required' });
  }

  const state = readDb();
  const member = state.members.find((m) => m.id === Number(member_id));
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const parsedAmount = amount != null ? Number(amount) : member.monthly_fee;
  const finalAmount = Number.isFinite(parsedAmount) ? parsedAmount : member.monthly_fee;
  const isPaid = paid === true || paid === 'true' || Number(paid) === 1 ? 1 : 0;
  const paidDate = isPaid ? new Date().toISOString() : null;

  let payment = state.payments.find(
    (p) => p.member_id === member.id && p.year === Number(year) && p.month === Number(month)
  );

  if (payment) {
    payment.amount = finalAmount;
    payment.paid = isPaid;
    payment.paid_date = paidDate;
  } else {
    payment = {
      id: getNextId(state.payments),
      member_id: member.id,
      year: Number(year),
      month: Number(month),
      amount: finalAmount,
      paid: isPaid,
      paid_date: paidDate,
    };
    state.payments.push(payment);
  }

  writeDb(state);
  res.json({ payment });
});

// Overview of all members who still owe for a given month (defaults to current month)
router.get('/overdue', (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;

  const state = readDb();
  const members = state.members.filter((m) => m.active === 1);

  const overdue = members.filter((m) => {
    const payment = state.payments.find(
      (p) => p.member_id === m.id && p.year === year && p.month === month
    );
    return !payment || payment.paid === 0;
  });

  res.json({ overdue, year, month });
});

module.exports = router;
