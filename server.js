require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./src/db'); // ensures tables exist on boot
const { startScheduler } = require('./src/services/scheduler');

const authRoutes = require('./src/routes/auth');
const memberRoutes = require('./src/routes/members');
const paymentRoutes = require('./src/routes/payments');
const bookingRoutes = require('./src/routes/bookings');
const smsRoutes = require('./src/routes/sms');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sms', smsRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Meepa Jumma Mosque Boarding server running on http://localhost:${PORT}`);
  startScheduler();
});
