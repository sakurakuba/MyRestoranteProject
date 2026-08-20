# QA Test Report — Le Petit Bistro

**Feature under test:** User accounts, online take-out ordering, 10% logged-in-member discount, table booking, menu item images
**Test basis:** [test-cases.md](test-cases.md) (56 documented test cases)
**Test method:** Automated black-box API testing ([run-tests.js](run-tests.js)) against a live local server, plus manual browser verification for UI/XSS rendering and image `src`/`alt` correctness
**Environment:** Node.js v26.0.0, Express, SQLite (`node:sqlite`), localhost:3000, fresh database per run
**Run date:** 2026-08-20 (updated for menu image feature)
**Tester:** Claude (AI QA), on behalf of ksulaymanov@gmail.com

## Summary

| Metric | Value |
|---|---|
| Total test cases | 56 (55 automated + 1 manual browser check) |
| Passed (final run) | 56 |
| Failed (final run) | 0 |
| Defects found during testing | 1 (Critical — XSS, found in an earlier pass) |
| Defects fixed | 1 / 1 |
| Defects open | 0 |

All 56 cases pass on the final run, including 6 new cases (TC-IMG-01…06) added for the menu item images feature. **One critical defect (stored/DOM XSS) was found in an earlier testing pass, fixed immediately, and re-verified** — see Defects below.

## Defects Found

### DEFECT-01 — Stored/DOM XSS via customer name field (Critical) — **FIXED**

- **Found by:** TC-ORD-19 (API accepted the payload) + manual browser follow-up
- **Description:** The order confirmation, booking confirmation, and logged-in user badge were built with `innerHTML` and interpolated the user-supplied `name` (and `phone`/`date`/`time`) directly, without escaping. Submitting an order with the name `<img src=x onerror=alert(1)>` caused the browser to parse and execute it as a live `<img>` element with an `onerror` handler.
- **Evidence (before fix):**
  ```
  hasImgTag: true
  html: "...Thanks, <img src="x" onerror="alert(1)">! Subtotal $3.50..."
  ```
- **Impact:** Any attacker-controlled name/phone (submitted by a user about themselves, or potentially viewed by staff in a future admin/order-history view) could execute arbitrary JavaScript in the viewer's browser session — session/cookie theft, UI redress, etc.
- **Root cause:** `backend/public/script.js` used template-literal `innerHTML` assignments for the order confirmation, booking confirmation, and the logged-in user chip, without HTML-escaping user input.
- **Fix applied:** Added an `escapeHtml()` helper and applied it to every user-controlled value rendered via `innerHTML` (customer name, phone, pickup time, booking date/time, and the logged-in user's display name).
- **Verification (after fix):**
  ```
  hasImgTag: false
  text: "...Thanks, <img src=x onerror=alert(1)>! Subtotal $3.50..." (rendered as inert text, no DOM element created)
  ```
- **Status:** ✅ Fixed and re-verified. Regression-safe: the server still accepts and stores the raw string (correct — storage isn't the vulnerable layer); only client-side rendering was patched.

No other defects were found. All boundary, negative, and security-adjacent cases (price/discount tampering, cross-user data access, SQL injection attempt, unauthenticated access to history endpoints, session cookie flags) passed as expected on the first run.

## Key Behaviors Verified

- **Discount correctness:** Logged-in users are charged exactly 10% less than guests for an identical cart ($33.50 → $30.15), computed and rounded server-side.
- **Server is the price authority:** A client that sends a fabricated `price`, `discount`, or `total` in the request body is ignored — the server always recomputes from its own menu and session state. Verified directly against the live API (guest cart tampered to `price: 0.01` still charged $25).
- **Discount requires an authenticated session, not a client flag:** discount is derived from `req.session.userId` server-side; a guest cannot self-grant a discount by sending `discountApplied: true`-style fields.
- **Data isolation:** Order and booking history endpoints (`/api/orders/mine`, `/api/bookings/mine`) are user-scoped and return 401 when unauthenticated; one user's orders never leak into another's history (verified with two independently registered accounts).
- **Input validation:** All numeric boundaries (quantity 1–50, guests 1–20), date/time formats, and required fields are enforced server-side, not just in the UI.
- **Guest vs. member booking linkage:** verified directly against the SQLite `bookings` table — guest bookings have `user_id = NULL`, logged-in bookings correctly store the member's `user_id`.
- **Menu images:** all 18 menu items (across all 4 categories) have a unique, reachable image (`image/svg+xml`, HTTP 200); a request for a non-existent image correctly 404s; and the rendered page's `<img>` `src`/`alt` for every item match the API's `image`/`name` fields exactly (verified in-browser against the live DOM, not just the API).

## Full Results

| ID | Title | Result | Notes |
|---|---|---|---|
| TC-AUTH-01 | Register with valid data | ✅ PASS | status=201 |
| TC-AUTH-02 | Register with missing fields | ✅ PASS | status=400 |
| TC-AUTH-03 | Register with invalid email format | ✅ PASS | status=400 |
| TC-AUTH-04 | Register with short password | ✅ PASS | status=400 |
| TC-AUTH-05 | Register with duplicate email | ✅ PASS | status=409 |
| TC-AUTH-06 | Duplicate email is case-insensitive | ✅ PASS | status=409 |
| TC-AUTH-07 | Login with correct credentials | ✅ PASS | status=200 |
| TC-AUTH-08 | Login with wrong password | ✅ PASS | status=401 |
| TC-AUTH-09 | Login with non-existent email | ✅ PASS | status=401 |
| TC-AUTH-10 | Login missing fields | ✅ PASS | status=400 |
| TC-AUTH-11 | /me without session | ✅ PASS | `{user:null}` |
| TC-AUTH-12 | /me with valid session | ✅ PASS | status=200 |
| TC-AUTH-13 | Logout clears session | ✅ PASS | `{user:null}` after logout |
| TC-AUTH-14 | SQL injection attempt in login email | ✅ PASS | status=401, no crash |
| TC-AUTH-15 | Concurrent duplicate registration | ✅ PASS | one 201, one 409 |
| TC-ORD-01 | Guest order — full price | ✅ PASS | discount=0, total=subtotal |
| TC-ORD-02 | Logged-in order — 10% discount | ✅ PASS | discount=3.35 |
| TC-ORD-03 | Discount math accuracy | ✅ PASS | 33.50 → 3.35 off → 30.15 |
| TC-ORD-04 | Price tampering ignored | ✅ PASS | server price=25 used, not client's 0.01 |
| TC-ORD-05 | Discount tampering ignored | ✅ PASS | guest still charged full $33.50 |
| TC-ORD-06 | Empty cart rejected | ✅ PASS | status=400 |
| TC-ORD-07 | Missing items field | ✅ PASS | status=400 |
| TC-ORD-08 | Unknown item id | ✅ PASS | status=400 |
| TC-ORD-09 | Quantity = 0 | ✅ PASS | status=400 |
| TC-ORD-10 | Negative quantity | ✅ PASS | status=400 |
| TC-ORD-11 | Non-integer quantity | ✅ PASS | status=400 |
| TC-ORD-12 | Quantity boundary (50) accepted | ✅ PASS | status=201 |
| TC-ORD-13 | Quantity boundary (51) rejected | ✅ PASS | status=400 |
| TC-ORD-14 | Missing name/phone/pickup | ✅ PASS | status=400 |
| TC-ORD-15 | Invalid pickup time format | ✅ PASS | status=400 |
| TC-ORD-16 | Order persisted with correct owner | ✅ PASS | discount recorded in history |
| TC-ORD-17 | Orders are user-scoped | ✅ PASS | no cross-user leakage |
| TC-ORD-18 | Unauthenticated access to order history | ✅ PASS | status=401 |
| TC-ORD-19 | XSS payload in customer name | ⚠️ Found defect → ✅ Fixed & re-verified | see DEFECT-01 |
| TC-BOOK-01 | Valid booking | ✅ PASS | status=201 |
| TC-BOOK-02 | Guests boundary (1) valid | ✅ PASS | status=201 |
| TC-BOOK-03 | Guests boundary (20) valid | ✅ PASS | status=201 |
| TC-BOOK-04 | Guests = 0 rejected | ✅ PASS | status=400 |
| TC-BOOK-05 | Guests over max (21) rejected | ✅ PASS | status=400 |
| TC-BOOK-06 | Non-integer guests rejected | ✅ PASS | status=400 |
| TC-BOOK-07 | Missing required fields | ✅ PASS | status=400 |
| TC-BOOK-08 | Invalid date format | ✅ PASS | status=400 |
| TC-BOOK-09 | Invalid time format | ✅ PASS | status=400 |
| TC-BOOK-10 | Past date/time rejected | ✅ PASS | status=400 |
| TC-BOOK-11 | Booking linked to logged-in user | ✅ PASS | appears in `/mine` |
| TC-BOOK-12 | Guest booking has no user_id | ✅ PASS | verified via direct DB query |
| TC-BOOK-13 | Unauthenticated access to booking history | ✅ PASS | status=401 |
| TC-IMG-01 | Every menu item has an image field | ✅ PASS | 18/18 items have `image` |
| TC-IMG-02 | Each menu image URL is reachable | ✅ PASS | 18/18 return 200 |
| TC-IMG-03 | Menu image response has an image content-type | ✅ PASS | `image/svg+xml` |
| TC-IMG-04 | Image count matches item count | ✅ PASS | 18 items, 18 unique images |
| TC-IMG-05 | Non-existent image returns 404 | ✅ PASS | status=404 |
| TC-IMG-06 | Rendered menu card image matches API (src/alt) | ✅ PASS | 18/18 `<img>` tags match, 0 mismatches (manual browser check) |
| TC-SEC-01 | Session cookie is httpOnly | ✅ PASS | `HttpOnly` flag present |
| TC-SEC-02 | Static file serving works | ✅ PASS | status=200 |
| TC-SEC-03 | Unknown API route returns 404 | ✅ PASS | status=404 |

## Known Limitations (out of scope / by design)

- Payment is simulated only — no real payment processor is integrated (stated as demo on the form itself). This was an explicit constraint carried over from the original site build.
- Session store is in-memory (`express-session` default `MemoryStore`), fine for a demo but not suitable for multi-process production deployment — would need a persistent store (e.g., Redis) in real production.
- No rate limiting on login/register — acceptable for a demo, but a real deployment should add brute-force protection.
- No password reset / email verification flow.

## How to Reproduce This Run

```bash
cd restaurant-website/backend
rm -f restaurant.db
node server.js &
cd ..
node qa/run-tests.js
```

Raw machine-readable results: [results.json](results.json). Raw generated table: [test-report-raw.md](test-report-raw.md).
