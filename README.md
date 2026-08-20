# MyRestoranteProject — Le Petit Bistro

A simple online restaurant website: French menu with prices, online take-out ordering
with a 10% discount for logged-in members, and online table booking.

## Structure

```
backend/            Express server + SQLite DB (source of truth for menu/prices/accounts)
  server.js          API routes: auth, menu, orders, bookings
  db.js              SQLite schema (users, orders, order_items, bookings)
  menu.js            Server-side menu data (never trusted from the client)
  public/            Frontend: index.html, style.css, script.js
qa/                  QA documentation and automated test suite
  test-cases.md       50 documented test cases (auth, ordering/discount, booking, security)
  test-report.md      Latest test run results, including defects found & fixed
  run-tests.js         Executable black-box test suite (hits the live API)
```

## Running the site

```bash
cd backend
npm install
node server.js
```

Open http://localhost:3000

## Features

- Menu, pricing, and cart are served from the backend (`GET /api/menu`) — prices cannot
  be tampered with from the browser; the server always recomputes totals itself.
- User accounts: sign up / log in / log out (bcrypt-hashed passwords, session cookies).
- **Logged-in users get 10% off every order automatically**, computed and enforced server-side.
  Guests pay full price.
- Online take-out ordering with a demo (non-functional) payment form — no real payment
  processing is wired up.
- Table booking with name, phone, party size, date, and time.
- Order and booking history are scoped per logged-in user (`/api/orders/mine`, `/api/bookings/mine`).

## QA

See [qa/test-cases.md](qa/test-cases.md) for the documented test cases and
[qa/test-report.md](qa/test-report.md) for the latest run's results (50/50 passing),
including one stored-XSS defect that was found and fixed during testing.

To re-run the automated suite against a running server:

```bash
cd backend && rm -f restaurant.db && node server.js &
cd .. && node qa/run-tests.js
```

## Known limitations (by design, demo scope)

- Payment is simulated only — no real payment processor integrated.
- Session store is in-memory; fine for local/demo use, not for multi-process production.
- No rate limiting on login/register, no password reset flow.
