const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('node:path');
const db = require('./db');
const { MENU, getItem } = require('./menu');

const app = express();
const PORT = process.env.PORT || 3000;
const LOGGED_IN_DISCOUNT_RATE = 0.10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

app.use(express.json());
app.use(session({
  secret: 'demo-secret-do-not-use-in-real-production',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 },
}));

// ---------- helpers ----------
function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email };
}

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  return missing;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------- auth ----------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const missing = requireFields(req.body || {}, ['name', 'email', 'password']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(String(name).trim(), normalizedEmail, hash);

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(info.lastInsertRowid);
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const missing = requireFields(req.body || {}, ['email', 'password']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  req.session.userId = row.id;
  res.json({ user: publicUser(row) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const row = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.session.userId);
  if (!row) return res.json({ user: null });
  res.json({ user: publicUser(row) });
});

// ---------- menu ----------
app.get('/api/menu', (req, res) => {
  res.json({ menu: MENU, discountRate: LOGGED_IN_DISCOUNT_RATE });
});

// ---------- orders ----------
app.post('/api/orders', (req, res) => {
  const { items, name, phone, pickup } = req.body || {};
  const missing = requireFields(req.body || {}, ['name', 'phone', 'pickup']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }
  if (!TIME_RE.test(pickup)) {
    return res.status(400).json({ error: 'Invalid pickup time format, expected HH:MM' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const resolvedItems = [];
  for (const raw of items) {
    const qty = Number(raw && raw.qty);
    const item = raw && getItem(raw.id);
    if (!item) {
      return res.status(400).json({ error: `Unknown menu item: ${raw && raw.id}` });
    }
    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) {
      return res.status(400).json({ error: `Invalid quantity for ${item.name}` });
    }
    resolvedItems.push({ ...item, qty });
  }

  const subtotal = round2(resolvedItems.reduce((sum, it) => sum + it.price * it.qty, 0));
  const isLoggedIn = Boolean(req.session.userId);
  const discount = isLoggedIn ? round2(subtotal * LOGGED_IN_DISCOUNT_RATE) : 0;
  const total = round2(subtotal - discount);

  const orderInfo = db.prepare(`
    INSERT INTO orders (user_id, customer_name, phone, pickup_time, subtotal, discount, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.session.userId || null, String(name).trim(), String(phone).trim(), pickup, subtotal, discount, total);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, item_id, item_name, unit_price, qty) VALUES (?, ?, ?, ?, ?)
  `);
  for (const it of resolvedItems) {
    insertItem.run(orderInfo.lastInsertRowid, it.id, it.name, it.price, it.qty);
  }

  res.status(201).json({
    order: {
      id: orderInfo.lastInsertRowid,
      items: resolvedItems.map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.qty })),
      subtotal,
      discount,
      total,
      discountApplied: isLoggedIn,
      pickup,
    },
  });
});

app.get('/api/orders/mine', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  res.json({ orders });
});

// ---------- bookings ----------
app.post('/api/bookings', (req, res) => {
  const { name, phone, guests, date, time } = req.body || {};
  const missing = requireFields(req.body || {}, ['name', 'phone', 'guests', 'date', 'time']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  const guestsNum = Number(guests);
  if (!Number.isInteger(guestsNum) || guestsNum < 1 || guestsNum > 20) {
    return res.status(400).json({ error: 'Guests must be an integer between 1 and 20' });
  }
  if (!DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Invalid date format, expected YYYY-MM-DD' });
  }
  if (!TIME_RE.test(time)) {
    return res.status(400).json({ error: 'Invalid time format, expected HH:MM' });
  }
  const requestedDateTime = new Date(`${date}T${time}:00`);
  if (Number.isNaN(requestedDateTime.getTime()) || requestedDateTime.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Booking date/time must be in the future' });
  }

  const info = db.prepare(`
    INSERT INTO bookings (user_id, name, phone, guests, date, time) VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.session.userId || null, String(name).trim(), String(phone).trim(), guestsNum, date, time);

  res.status(201).json({
    booking: { id: info.lastInsertRowid, name, phone, guests: guestsNum, date, time },
  });
});

app.get('/api/bookings/mine', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const bookings = db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);
  res.json({ bookings });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Le Petit Bistro server running on http://localhost:${PORT}`);
});
