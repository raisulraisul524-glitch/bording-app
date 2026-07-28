const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDb } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = readDb();
  const admin = db.admins.find((user) => user.username === username);
  if (!admin) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  const ok = bcrypt.compareSync(password, admin.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured on the server' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, username: admin.username });
});

module.exports = router;
