const express = require('express');
const { readDb, writeDb, getNextId } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// List all members, with this month's payment status attached
router.get('/', (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || now.getMonth() + 1;

  const state = readDb();
  const members = [...state.members].sort((a, b) => {
    if (a.active !== b.active) return b.active - a.active;
    return a.full_name.localeCompare(b.full_name);
  });

  const result = members.map((m) => {
    const payment = state.payments.find(
      (p) => p.member_id === m.id && p.year === year && p.month === month
    );
    return {
      ...m,
      current_payment: payment || { paid: 0, amount: m.monthly_fee, paid_date: null },
    };
  });

  res.json({ members: result, year, month });
});

// Add a new member (name + phone required)
router.post('/', (req, res) => {
  const { full_name, phone, room_no, monthly_fee, notes } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required' });
  }

  const state = readDb();
  const member = {
    id: getNextId(state.members),
    full_name: full_name.trim(),
    phone: phone.trim(),
    room_no: room_no || null,
    monthly_fee: Number(monthly_fee) || 0,
    join_date: new Date().toISOString(),
    active: 1,
    notes: notes || null,
  };

  state.members.push(member);
  writeDb(state);
  res.status(201).json({ member });
});

// Update a member (edit phone number, fee, room, active status, etc.)
router.put('/:id', (req, res) => {
  const { full_name, phone, room_no, monthly_fee, active, notes } = req.body;
  const state = readDb();
  const member = state.members.find((m) => m.id === Number(req.params.id));
  if (!member) return res.status(404).json({ error: 'Member not found' });

  member.full_name = full_name ?? member.full_name;
  member.phone = phone ?? member.phone;
  member.room_no = room_no ?? member.room_no;
  member.monthly_fee = monthly_fee != null ? Number(monthly_fee) : member.monthly_fee;
  member.active = active != null
    ? active === true || active === 'true' || Number(active) === 1
      ? 1
      : 0
    : member.active;
  member.notes = notes ?? member.notes;

  writeDb(state);
  res.json({ member });
});

// Remove a member entirely
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const state = readDb();
  state.members = state.members.filter((m) => m.id !== id);
  state.payments = state.payments.filter((p) => p.member_id !== id);
  writeDb(state);
  res.json({ ok: true });
});

module.exports = router;
