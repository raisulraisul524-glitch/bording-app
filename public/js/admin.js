const API = '/api';
let token = localStorage.getItem('mjb_token') || null;
let currentYear, currentMonth;

const loginScreen = document.getElementById('loginScreen');
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.className = 'toast visible' + (isError ? ' err' : '');
  setTimeout(() => { toastEl.className = 'toast'; }, 3200);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showApp() {
  loginScreen.style.display = 'none';
  app.classList.add('visible');
  initPeriodSelect();
  refreshAll();
}

function showLogin() {
  app.classList.remove('visible');
  loginScreen.style.display = 'flex';
}

// ---------- Auth ----------
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const errEl = document.getElementById('loginError');
  if (errEl) errEl.textContent = '';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    token = data.token;
    localStorage.setItem('mjb_token', token);
    showApp();
  } catch (err) {
    if (errEl) errEl.textContent = err.message;
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('mjb_token');
  showLogin();
});

// ---------- Period select ----------
function initPeriodSelect() {
  const sel = document.getElementById('periodSelect');
  sel.innerHTML = '';
  const now = new Date();
  const options = [];
  for (let i = -3; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) });
  }
  options.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = `${o.year}-${o.month}`;
    opt.textContent = o.label;
    if (o.year === now.getFullYear() && o.month === now.getMonth() + 1) opt.selected = true;
    sel.appendChild(opt);
  });
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;

  sel.addEventListener('change', () => {
    const [y, m] = sel.value.split('-').map(Number);
    currentYear = y;
    currentMonth = m;
    loadMembers();
  });
}

// ---------- Members & payments ----------
async function loadMembers() {
  try {
    const data = await api(`/members?year=${currentYear}&month=${currentMonth}`);
    renderMembers(data.members);
    renderStats(data.members);
  } catch (err) {
    showToast(err.message, true);
    if (err.message.includes('session') || err.message.includes('authenticated')) showLogin();
  }
}

function renderStats(members) {
  const active = members.filter((m) => m.active);
  const paid = active.filter((m) => m.current_payment.paid);
  const unpaid = active.length - paid.length;
  const collected = paid.reduce((sum, m) => sum + Number(m.current_payment.amount || 0), 0);

  const stats = [
    { label: 'Active members', value: active.length },
    { label: 'Paid this period', value: paid.length },
    { label: 'Unpaid this period', value: unpaid, warn: unpaid > 0 },
    { label: 'Collected', value: `Rs ${collected.toLocaleString()}` },
  ];

  document.getElementById('statGrid').innerHTML = stats
    .map(
      (s) => `<div class="stat-card ${s.warn ? 'warn' : ''}"><div class="label">${s.label}</div><div class="value">${s.value}</div></div>`
    )
    .join('');
}

function renderMembers(members) {
  const body = document.getElementById('membersBody');
  const empty = document.getElementById('membersEmpty');
  if (!members.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = members
    .map((m) => {
      const paid = m.current_payment.paid;
      const amount = m.current_payment.amount != null ? m.current_payment.amount : m.monthly_fee;
      return `
      <tr data-id="${m.id}">
        <td>${escapeHtml(m.full_name)}${m.active ? '' : ' <span class="badge inactive">inactive</span>'}</td>
        <td>${escapeHtml(m.phone)}</td>
        <td>${escapeHtml(m.room_no || '—')}</td>
        <td>Rs ${Number(m.monthly_fee).toLocaleString()}</td>
        <td>Rs ${Number(amount).toLocaleString()}</td>
        <td><span class="badge payment-status ${paid ? 'paid' : 'unpaid'}">${paid ? 'Paid' : 'Unpaid'}</span></td>
        <td class="row-actions">
          <button class="btn btn-outline btn-sm toggle-paid-btn">${paid ? 'Mark unpaid' : 'Mark paid'}</button>
          <button class="btn btn-outline btn-sm remind-btn">Remind</button>
        </td>
      </tr>`;
    })
    .join('');

  body.querySelectorAll('.toggle-paid-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const id = row.dataset.id;
      const paidNow = row.querySelector('.payment-status').classList.contains('paid');
      try {
        await api('/payments/mark', {
          method: 'POST',
          body: JSON.stringify({ member_id: id, year: currentYear, month: currentMonth, paid: !paidNow }),
        });
        loadMembers();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  body.querySelectorAll('.remind-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const row = e.target.closest('tr');
      const id = row.dataset.id;
      try {
        await api(`/sms/send-one/${id}`, { method: 'POST', body: JSON.stringify({}) });
        showToast('Reminder sent.');
        loadSmsLog();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

document.getElementById('addMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    full_name: document.getElementById('m_name').value.trim(),
    phone: document.getElementById('m_phone').value.trim(),
    room_no: document.getElementById('m_room').value.trim(),
    monthly_fee: document.getElementById('m_fee').value,
    notes: document.getElementById('m_notes').value.trim(),
  };
  try {
    await api('/members', { method: 'POST', body: JSON.stringify(payload) });
    e.target.reset();
    showToast('Member added.');
    loadMembers();
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById('sendRemindersBtn').addEventListener('click', async () => {
  try {
    showToast('Sending reminders...');
    const data = await api('/sms/send-reminders', {
      method: 'POST',
      body: JSON.stringify({ year: currentYear, month: currentMonth }),
    });
    const sent = data.results.filter((r) => r.status === 'sent').length;
    const failed = data.results.filter((r) => r.status === 'failed').length;
    showToast(`Reminders sent: ${sent} sent, ${failed} failed.`, failed > 0 && sent === 0);
    loadSmsLog();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Applications ----------
async function loadApplications() {
  try {
    const data = await api('/bookings');
    const body = document.getElementById('applicationsBody');
    const empty = document.getElementById('applicationsEmpty');
    if (!data.applications.length) {
      body.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    body.innerHTML = data.applications
      .map(
        (a) => `
      <tr>
        <td>${escapeHtml(a.full_name)}</td>
        <td>${escapeHtml(a.phone)}</td>
        <td>${escapeHtml(a.email || '—')}</td>
        <td>${escapeHtml(a.message || '—')}</td>
        <td><span class="badge ${a.status === 'new' ? 'unpaid' : 'paid'}">${a.status}</span></td>
        <td>${new Date(a.created_at).toLocaleDateString()}</td>
      </tr>`
      )
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- SMS log ----------
async function loadSmsLog() {
  try {
    const data = await api('/sms/log');
    const body = document.getElementById('smsLogBody');
    const empty = document.getElementById('smsLogEmpty');
    if (!data.log.length) {
      body.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    body.innerHTML = data.log
      .map(
        (l) => `
      <tr>
        <td>${escapeHtml(l.phone)}</td>
        <td>${escapeHtml(l.body.slice(0, 60))}${l.body.length > 60 ? '…' : ''}</td>
        <td><span class="badge ${l.status.startsWith('sent') ? 'paid' : 'unpaid'}">${l.status.startsWith('sent') ? 'Sent' : 'Failed'}</span></td>
        <td>${new Date(l.sent_at).toLocaleString()}</td>
      </tr>`
      )
      .join('');
  } catch (err) {
    showToast(err.message, true);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function refreshAll() {
  loadMembers();
  loadApplications();
  loadSmsLog();
}

// ---------- Boot ----------
if (token) {
  showApp();
} else {
  showLogin();
}
