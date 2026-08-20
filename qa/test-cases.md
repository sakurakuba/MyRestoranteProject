# Test Case Documentation — Le Petit Bistro (Backend + Discount Logic)

Scope: user registration/login, online ordering with 10% logged-in discount, table booking.
Format: `ID | Title | Preconditions | Steps | Expected Result | Priority`

## 1. Authentication

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-AUTH-01 | Register with valid data | Email not already registered | POST /api/auth/register with name, valid email, password ≥6 chars | 201, user object returned, session cookie set | Critical |
| TC-AUTH-02 | Register with missing fields | — | POST /api/auth/register with `email` and `password` only (no `name`) | 400, error lists missing field(s) | High |
| TC-AUTH-03 | Register with invalid email format | — | POST with email `"not-an-email"` | 400, "Invalid email format" | High |
| TC-AUTH-04 | Register with short password | — | POST with password `"123"` (5 chars) | 400, password length error | Medium |
| TC-AUTH-05 | Register with duplicate email | User already exists | POST register again with same email | 409, "account already exists" | Critical |
| TC-AUTH-06 | Duplicate email is case-insensitive | User `test@x.com` exists | POST register with `TEST@X.com` | 409 (treated as duplicate) | Medium |
| TC-AUTH-07 | Login with correct credentials | Registered user exists | POST /api/auth/login with correct email/password | 200, user object, session cookie set | Critical |
| TC-AUTH-08 | Login with wrong password | Registered user exists | POST login with correct email, wrong password | 401, "Invalid email or password" | Critical |
| TC-AUTH-09 | Login with non-existent email | — | POST login with unregistered email | 401, generic invalid-credentials error (no user enumeration) | High |
| TC-AUTH-10 | Login missing fields | — | POST login with empty body | 400, missing field error | Medium |
| TC-AUTH-11 | /me without session | No cookie sent | GET /api/auth/me | 200, `{user: null}` | Medium |
| TC-AUTH-12 | /me with valid session | Logged in | GET /api/auth/me with session cookie | 200, correct user returned | Medium |
| TC-AUTH-13 | Logout clears session | Logged in | POST /api/auth/logout, then GET /api/auth/me | `/me` returns `{user: null}` after logout | High |
| TC-AUTH-14 | SQL injection attempt in login email | — | POST login with email `"' OR '1'='1"` | 400/401, no crash, no auth bypass | Critical (security) |
| TC-AUTH-15 | Concurrent duplicate registration | — | Fire 2 parallel POST register with identical new email | Exactly one 201, one 409 (no duplicate rows) | High |

## 2. Online Ordering & Discount Logic

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-ORD-01 | Guest order — full price | Not logged in | POST /api/orders with items, no session cookie | 201, `discountApplied:false`, `discount:0`, total = subtotal | Critical |
| TC-ORD-02 | Logged-in order — 10% discount | Logged in | POST /api/orders with same cart, session cookie present | 201, `discountApplied:true`, `discount` = 10% of subtotal, total = subtotal − discount | Critical |
| TC-ORD-03 | Discount math accuracy | Logged in | Order subtotal $33.50 | discount = $3.35, total = $30.15 (rounded to 2dp) | Critical |
| TC-ORD-04 | Price tampering ignored | Any | Client sends fabricated `price` field per item | Server recomputes price from its own menu, ignoring client price | Critical (security) |
| TC-ORD-05 | Discount tampering ignored | Guest (no session) | Client sends `discount`/`total` fields directly in body | Server ignores client totals; computes independently from session state | Critical (security) |
| TC-ORD-06 | Empty cart rejected | — | POST /api/orders with `items: []` | 400, "must contain at least one item" | High |
| TC-ORD-07 | Missing items field | — | POST without `items` key | 400 | High |
| TC-ORD-08 | Unknown item id | — | POST with `items: [{id:"zz9", qty:1}]` | 400, "Unknown menu item" | High |
| TC-ORD-09 | Quantity = 0 | — | POST with qty 0 | 400, invalid quantity | Medium |
| TC-ORD-10 | Negative quantity | — | POST with qty -1 | 400, invalid quantity | Medium |
| TC-ORD-11 | Non-integer quantity | — | POST with qty 2.5 | 400, invalid quantity | Medium |
| TC-ORD-12 | Quantity at upper boundary (50) | — | POST with qty 50 | 201, accepted | Low |
| TC-ORD-13 | Quantity over upper boundary (51) | — | POST with qty 51 | 400, invalid quantity | Medium |
| TC-ORD-14 | Missing name/phone/pickup | — | POST without `name` | 400, missing field listed | Medium |
| TC-ORD-15 | Invalid pickup time format | — | POST with pickup `"25:99"` | 400, invalid time format | Medium |
| TC-ORD-16 | Order persisted with correct owner | Logged in as user A | Place order, then GET /api/orders/mine as user A | Order appears in user A's history with correct discount | High |
| TC-ORD-17 | Orders are user-scoped | User A and User B both order | GET /api/orders/mine as user B | Only user B's orders returned, not user A's | Critical (security) |
| TC-ORD-18 | Unauthenticated access to order history | Not logged in | GET /api/orders/mine | 401 | High |
| TC-ORD-19 | XSS payload in customer name | — | POST order with name `<img src=x onerror=alert(1)>` | Stored safely; when rendered in UI it must NOT execute as HTML (must be escaped) | Critical (security) |

## 3. Table Booking

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-BOOK-01 | Valid booking | — | POST /api/bookings with valid name, phone, guests, future date/time | 201, booking confirmation returned | Critical |
| TC-BOOK-02 | Guests lower boundary valid (1) | — | POST with guests=1 | 201 | Medium |
| TC-BOOK-03 | Guests upper boundary valid (20) | — | POST with guests=20 | 201 | Medium |
| TC-BOOK-04 | Guests = 0 rejected | — | POST with guests=0 | 400 | High |
| TC-BOOK-05 | Guests over max (21) rejected | — | POST with guests=21 | 400 | High |
| TC-BOOK-06 | Non-integer guests | — | POST with guests=2.5 | 400 | Medium |
| TC-BOOK-07 | Missing required fields | — | POST without `phone` | 400, missing field listed | Medium |
| TC-BOOK-08 | Invalid date format | — | POST with date `"20-08-2026"` | 400, invalid date format | Medium |
| TC-BOOK-09 | Invalid time format | — | POST with time `"7:00pm"` | 400, invalid time format | Medium |
| TC-BOOK-10 | Past date/time rejected | — | POST with date/time in the past | 400, "must be in the future" | High |
| TC-BOOK-11 | Booking linked to logged-in user | Logged in | POST booking while logged in, then GET /api/bookings/mine | Booking associated with user_id, appears in history | Medium |
| TC-BOOK-12 | Guest booking has no user_id | Not logged in | POST booking, inspect DB row | `user_id` is NULL | Medium |
| TC-BOOK-13 | Unauthenticated access to booking history | Not logged in | GET /api/bookings/mine | 401 | Medium |

## 4. Cross-Cutting / Session Security

| ID | Title | Preconditions | Steps | Expected Result | Priority |
|---|---|---|---|---|---|
| TC-SEC-01 | Session cookie is httpOnly | Logged in | Inspect Set-Cookie header | `HttpOnly` flag present (not readable via `document.cookie`) | Critical (security) |
| TC-SEC-02 | Static file serving works | — | GET / | 200, index.html served | Low |
| TC-SEC-03 | Unknown API route | — | GET /api/does-not-exist | 404 | Low |
