const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'mosque_boarding.json');

const initialState = {
  admins: [],
  members: [],
  payments: [],
  booking_applications: [],
  sms_log: [],
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function ensureDbFile() {
  ensureDataDir();
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2), 'utf8');
    return;
  }

  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    if (!raw.trim()) {
      fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2), 'utf8');
    }
  } catch (err) {
    fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(dbFile, 'utf8');
  return raw.trim() ? JSON.parse(raw) : JSON.parse(JSON.stringify(initialState));
}

function writeDb(state) {
  ensureDataDir();
  fs.writeFileSync(dbFile, JSON.stringify(state, null, 2), 'utf8');
}

function getNextId(items) {
  if (!Array.isArray(items) || items.length === 0) return 1;
  return Math.max(...items.map((item) => Number(item.id) || 0)) + 1;
}

ensureDbFile();

module.exports = { readDb, writeDb, getNextId };
