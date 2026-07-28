const { readDb, writeDb, getNextId } = require('../db');

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token || !sid.startsWith('AC')) {
    return null;
  }
  const twilio = require('twilio');
  return twilio(sid, token);
}

function logSms(memberId, phone, body, status) {
  const state = readDb();
  const entry = {
    id: getNextId(state.sms_log),
    member_id: memberId,
    phone,
    body,
    status,
    sent_at: new Date().toISOString(),
  };
  state.sms_log.push(entry);
  writeDb(state);
  return entry;
}

async function sendSms(phone, body, memberId = null) {
  const client = getClient();
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!client || !from) {
    const msg = 'Twilio is not configured (missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER in .env)';
    logSms(memberId, phone, body, 'failed: not configured');
    throw new Error(msg);
  }

  try {
    const result = await client.messages.create({ to: phone, from, body });
    logSms(memberId, phone, body, `sent:${result.sid}`);
    return result;
  } catch (err) {
    logSms(memberId, phone, body, `failed: ${err.message}`);
    throw err;
  }
}

function reminderText(member, year, month) {
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  return `Assalamu Alaikum ${member.full_name}, this is a reminder from Meepa Jumma Mosque Boarding that your boarding payment of Rs. ${member.monthly_fee} for ${monthName} ${year} is due. Please settle it at your earliest convenience. Jazakallah Khair.`;
}

// Send reminders to every active, unpaid member for the given month
async function sendMonthlyReminders(year, month) {
  const state = readDb();
  const members = state.members.filter((m) => m.active === 1);

  const results = [];
  for (const member of members) {
    const payment = state.payments.find(
      (p) => p.member_id === member.id && p.year === year && p.month === month
    );
    if (payment && payment.paid) continue; // already paid, skip

    const body = reminderText(member, year, month);
    try {
      await sendSms(member.phone, body, member.id);
      results.push({ member_id: member.id, phone: member.phone, status: 'sent' });
    } catch (err) {
      results.push({ member_id: member.id, phone: member.phone, status: 'failed', error: err.message });
    }
  }
  return results;
}

module.exports = { sendSms, sendMonthlyReminders, reminderText };
