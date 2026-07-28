# Meepa Jumma Mosque Boarding

A boarding booking & payment-tracking website with:
- Animated public site (about, rooms/pricing, booking application form)
- Admin dashboard: add/manage members with phone numbers, mark monthly payments, view applications
- Automatic monthly SMS payment reminders (Twilio) to any member who hasn't paid yet, plus a manual "send reminders now" button and per-member "remind" button

## 1. Install

Requires Node.js 18+.

```bash
npm install
```

## 2. Configure

Copy the example env file and fill in your own values:

```bash
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — any long random string
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — your admin login (only used once, to create the account)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — from your Twilio console (see below)
- `REMINDER_DAY_OF_MONTH` — day of the month (1–28) the automatic reminder SMS goes out

### Getting Twilio credentials (for real SMS)
1. Create a free account at https://www.twilio.com
2. From the Twilio Console dashboard, copy your **Account SID** and **Auth Token** into `.env`
3. Buy/activate a phone number (Twilio gives a trial number) and put it in `TWILIO_FROM_NUMBER` (with country code, e.g. `+14155551234`)
4. Trial accounts can only text numbers you've verified in the Twilio console — upgrade the account to send to any number
5. Local numbers (e.g. Sri Lankan `+94`) may need SMS capability enabled for that country in Twilio — check "Messaging" → "Geo permissions" in the console

If Twilio isn't configured yet, the app still works fully — SMS sends will just fail gracefully and log the failure, so you can build/test everything else first.

## 3. Create the admin account

```bash
npm run create-admin
```

This reads `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` and creates the login. Run it again anytime to reset the password.

## 4. Run it

```bash
npm start
```

- Public site: http://localhost:4000
- Admin dashboard: http://localhost:4000/admin

## How it works

- **Public site** (`public/index.html`) — visitors can submit a boarding application (name + phone + message). These land in the admin dashboard under "Boarding applications."
- **Admin dashboard** (`public/admin.html`) — after logging in:
  - Add members with their **phone number**, room, and **monthly fee**
  - See a table of all members with this month's payment status
  - Click **Mark paid / Mark unpaid** to toggle a member's payment for the selected month
  - Switch the month dropdown to review past months
  - Click **Send SMS reminders to unpaid** to text everyone who hasn't paid for the selected month, right now
  - Click **Remind** on a single row to text just that member
  - See a log of every SMS sent (and whether it succeeded)
- **Automatic monthly reminders** — a background job (`src/services/scheduler.js`) checks daily and, on `REMINDER_DAY_OF_MONTH`, texts every active member who hasn't paid yet for the current month. This only runs while the server process is running, so for production use a host that keeps the process alive (see below).

## Deploying it for real

This is a normal Node.js + SQLite app, so it runs on any Node host. Simple free/cheap options:

- **Render.com** — "Web Service" from your repo, build command `npm install`, start command `npm start`, add your `.env` values as environment variables. Attach a small persistent disk mounted at `/data` if you want the SQLite file to survive redeploys (adjust `src/db.js`'s `dataDir` accordingly).
- **Railway.app** — similar one-click deploy from a GitHub repo, with a persistent volume for the `data/` folder.
- **A VPS (DigitalOcean, etc.)** — clone the repo, `npm install`, run with `pm2 start server.js` so it stays alive, put Nginx in front for HTTPS.

Whichever you choose, push this folder to a GitHub repo first, then connect that repo to the host.

## Project structure

```
server.js                  # Express app entry point
src/db.js                  # SQLite schema (members, payments, applications, sms_log)
src/middleware/auth.js     # JWT auth guard for admin routes
src/routes/auth.js         # POST /api/auth/login
src/routes/members.js      # member CRUD (name, phone, room, fee)
src/routes/payments.js     # mark payments, overdue list
src/routes/bookings.js     # public application form + admin list
src/routes/sms.js          # manual "send now" + per-member SMS + log
src/services/sms.js        # Twilio wrapper + reminder message text
src/services/scheduler.js  # daily cron check for the monthly auto-reminder
scripts/create-admin.js    # one-time admin account creation
public/                    # the actual website (landing page + admin dashboard)
```

## Customizing

- Edit the SMS wording in `src/services/sms.js` → `reminderText()`
- Edit room types/pricing in `public/index.html` (the "Rooms & pricing" section — these are just display text, not tied to the database)
- Change colors/fonts via the CSS variables at the top of `public/css/style.css` and `public/css/admin.css`
