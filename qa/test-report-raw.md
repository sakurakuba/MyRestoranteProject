# QA Test Report — Le Petit Bistro (Backend + Discount Logic)

Run date: 2026-08-20T17:28:17.711Z
Target: http://localhost:3000
Result: **55/55 passed** (0 failed)

| ID | Title | Result | Notes |
|---|---|---|---|
| TC-AUTH-01 | Register with valid data | ✅ PASS | status=201 |
| TC-AUTH-02 | Register with missing fields | ✅ PASS | status=400 body={"error":"Missing required field(s): name"} |
| TC-AUTH-03 | Register with invalid email format | ✅ PASS | status=400 |
| TC-AUTH-04 | Register with short password | ✅ PASS | status=400 |
| TC-AUTH-05 | Register with duplicate email | ✅ PASS | status=409 |
| TC-AUTH-06 | Duplicate email is case-insensitive | ✅ PASS | status=409 |
| TC-AUTH-07 | Login with correct credentials | ✅ PASS | status=200 |
| TC-AUTH-08 | Login with wrong password | ✅ PASS | status=401 |
| TC-AUTH-09 | Login with non-existent email | ✅ PASS | status=401 |
| TC-AUTH-10 | Login missing fields | ✅ PASS | status=400 |
| TC-AUTH-11 | /me without session | ✅ PASS | status=200 body={"user":null} |
| TC-AUTH-12 | /me with valid session | ✅ PASS | status=200 |
| TC-AUTH-13 | Logout clears session | ✅ PASS | body={"user":null} |
| TC-AUTH-14 | SQL injection attempt in login email | ✅ PASS | status=401 body={"error":"Invalid email or password"} |
| TC-AUTH-15 | Concurrent duplicate registration | ✅ PASS | statuses=201,409 |
| TC-ORD-01 | Guest order — full price | ✅ PASS | status=201 body={"id":1,"items":[{"id":"p4","name":"Steak Frites","price":25,"qty":1},{"id":"d1","name":"Crème Brûlée","price":8.5,"qty":1}],"subtotal":33.5,"discount":0,"total":33.5,"discountApplied":false,"pickup":"18:00"} |
| TC-ORD-02 | Logged-in order — 10% discount | ✅ PASS | status=201 body={"id":2,"items":[{"id":"p4","name":"Steak Frites","price":25,"qty":1},{"id":"d1","name":"Crème Brûlée","price":8.5,"qty":1}],"subtotal":33.5,"discount":3.35,"total":30.15,"discountApplied":true,"pickup":"18:30"} |
| TC-ORD-03 | Discount math accuracy ($33.50 -> $3.35 off -> $30.15) | ✅ PASS | subtotal=33.5 discount=3.35 total=30.15 |
| TC-ORD-04 | Price tampering ignored (server recomputes from menu) | ✅ PASS | returned price=25 |
| TC-ORD-05 | Discount tampering ignored (guest gets full price regardless of body) | ✅ PASS | body={"id":4,"items":[{"id":"p4","name":"Steak Frites","price":25,"qty":1},{"id":"d1","name":"Crème Brûlée","price":8.5,"qty":1}],"subtotal":33.5,"discount":0,"total":33.5,"discountApplied":false,"pickup":"19:05"} |
| TC-ORD-06 | Empty cart rejected | ✅ PASS | status=400 |
| TC-ORD-07 | Missing items field | ✅ PASS | status=400 |
| TC-ORD-08 | Unknown item id | ✅ PASS | status=400 |
| TC-ORD-09 | Quantity = 0 | ✅ PASS | status=400 |
| TC-ORD-10 | Negative quantity | ✅ PASS | status=400 |
| TC-ORD-11 | Non-integer quantity | ✅ PASS | status=400 |
| TC-ORD-12 | Quantity at upper boundary (50) accepted | ✅ PASS | status=201 |
| TC-ORD-13 | Quantity over upper boundary (51) rejected | ✅ PASS | status=400 |
| TC-ORD-14 | Missing name/phone/pickup | ✅ PASS | status=400 |
| TC-ORD-15 | Invalid pickup time format | ✅ PASS | status=400 |
| TC-ORD-16 | Order persisted with correct owner (discount recorded) | ✅ PASS | count=1 |
| TC-ORD-17 | Orders are user-scoped (no cross-user leakage) | ✅ PASS | bOrders=1 leaked=false |
| TC-ORD-18 | Unauthenticated access to order history | ✅ PASS | status=401 |
| TC-ORD-19 | XSS payload in customer name (server accepts; frontend must escape on render) | ✅ PASS | status=201 — see manual frontend-escaping check below |
| TC-BOOK-01 | Valid booking | ✅ PASS | status=201 |
| TC-BOOK-02 | Guests lower boundary valid (1) | ✅ PASS | status=201 |
| TC-BOOK-03 | Guests upper boundary valid (20) | ✅ PASS | status=201 |
| TC-BOOK-04 | Guests = 0 rejected | ✅ PASS | status=400 |
| TC-BOOK-05 | Guests over max (21) rejected | ✅ PASS | status=400 |
| TC-BOOK-06 | Non-integer guests rejected | ✅ PASS | status=400 |
| TC-BOOK-07 | Missing required fields | ✅ PASS | status=400 |
| TC-BOOK-08 | Invalid date format | ✅ PASS | status=400 |
| TC-BOOK-09 | Invalid time format | ✅ PASS | status=400 |
| TC-BOOK-10 | Past date/time rejected | ✅ PASS | status=400 |
| TC-BOOK-11 | Booking linked to logged-in user | ✅ PASS | mineCount=1 |
| TC-BOOK-12 | Guest booking has no user_id (verified via DB query) | ✅ PASS | see report notes / DB spot check |
| TC-BOOK-13 | Unauthenticated access to booking history | ✅ PASS | status=401 |
| TC-IMG-01 | Every menu item has an image field | ✅ PASS | checked=18 missing=0 |
| TC-IMG-02 | Each menu image URL is reachable (200) | ✅ PASS | checked=18 failing=[] |
| TC-IMG-03 | Menu image response has an image content-type | ✅ PASS | contentTypes=image/svg+xml |
| TC-IMG-04 | Image count matches item count (one unique image per item) | ✅ PASS | items=18 uniqueImages=18 |
| TC-IMG-05 | Requesting a non-existent image returns 404 | ✅ PASS | status=404 |
| TC-SEC-01 | Session cookie is httpOnly | ✅ PASS | set-cookie=connect.sid=s%3AgA4Mz7Kv5i3S058nUrNgxZOB7_ulZGL2.ASs4Lt1VU3%2FI0fepL1qD7sehMwSyMcp3K352o4uzWDg; Path=/; Expires=Fri, 21 Aug 2026 17:28:17 GMT; HttpOnly; SameSite=Lax |
| TC-SEC-02 | Static file serving works | ✅ PASS | status=200 |
| TC-SEC-03 | Unknown API route returns 404 | ✅ PASS | status=404 |