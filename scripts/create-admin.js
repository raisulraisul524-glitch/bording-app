require('dotenv').config();
const bcrypt = require('bcryptjs');
const { readDb, writeDb, getNextId } = require('../src/db');

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file first.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
const state = readDb();
const existing = state.admins.find((admin) => admin.username === username);

if (existing) {
  existing.password_hash = hash;
  writeDb(state);
  console.log(`Admin "${username}" password updated.`);
} else {
  state.admins.push({
    id: getNextId(state.admins),
    username,
    password_hash: hash,
    created_at: new Date().toISOString(),
  });
  writeDb(state);
  console.log(`Admin "${username}" created.`);
}
