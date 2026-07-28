const express = require('express');
const { readDb, writeDb, getNextId } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: submit a boarding application from the website
router.post('/', (req, res) => {
  const { full_name, phone, email, message } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required' });
  }

  const state = readDb();
  const application = {
    id: getNextId(state.booking_applications),
    full_name: full_name.trim(),
    phone: phone.trim(),
    email: email || null,
    message: message || null,
    status: 'new',
    created_at: new Date().toISOString(),
  };

  state.booking_applications.push(application);
  writeDb(state);
  res.status(201).json({ id: application.id });
});

// Admin: list applications
router.get('/', requireAuth, (req, res) => {
  const state = readDb();
  const applications = [...state.booking_applications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  res.json({ applications });
});

// Admin: update application status (new / contacted / accepted / declined)
router.put('/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const state = readDb();
  const application = state.booking_applications.find((item) => item.id === Number(req.params.id));
  if (!application) {
    return res.status(404).json({ error: 'Application not found' });
  }
  application.status = status || application.status;
  writeDb(state);
  res.json({ ok: true });
});

module.exports = router;
