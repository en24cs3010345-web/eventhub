# EventHub — Event & Ticket Booking Platform (B.Tech CSE Minor Project)

Full-stack app for discovering and booking live events in India.
**React + Tailwind · Node/Express · PostgreSQL · JWT/bcrypt · Razorpay · QR tickets · Cloudinary**

## Structure
```
eventhub/
├── backend/src/
│   ├── config/        db pool, env, razorpay, cloudinary
│   ├── database/      schema.sql, init.js, seed.js
│   ├── middleware/    auth (JWT + roles), validate, upload, error
│   ├── controllers/   auth, event, booking, payment, ticket, dashboard, admin
│   ├── routes/        index.js (all REST routes + validation rules)
│   ├── services/      inventory.js (hold / release / expiry logic)
│   └── app.js, server.js
└── frontend/src/
    ├── components/    Navbar, Footer, EventCard, SeatMap, Poster, ui.jsx …
    ├── pages/         Home, AuthPages, Events, EventDetails, TicketSelection, Checkout,
    │                  MyBookings, TicketView, Profile, OrganizerDashboard, EventForm,
    │                  OrganizerBookings, AdminDashboard
    ├── context/       AuthContext, ToastContext
    └── api/client.js  Axios instance (+ sample-data fallback when the API is offline)
```

## 1. Prerequisites
Node.js 18+, PostgreSQL 13+ (create an empty database: `createdb eventhub`).

## 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
npm run db:init             # creates all tables
npm run db:seed             # demo users, categories, 10 sample events
npm run dev                 # API on http://localhost:5000
```

### Environment variables (`backend/.env`)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | e.g. `postgresql://postgres:password@localhost:5432/eventhub` |
| `JWT_SECRET` | long random string (required in production) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | from Razorpay Dashboard → Test Mode keys. **Blank = built-in DEMO payment mode** (one-click fake payment, great for viva demos) |
| `CLOUDINARY_*` | for poster upload. Blank = organizers paste an image URL instead |
| `BOOKING_HOLD_MINUTES` | how long tickets are held during checkout (default 10) |
| `CANCELLATION_HOURS_BEFORE` | cancellation cut-off before event start (default 24) |

## 3. Frontend setup
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :5000)
```
Production build: `npm run build`. If hosting the API elsewhere, set `VITE_API_URL`.

## 4. Demo logins (after `db:seed`) — password `Password@123`
| Role | Email |
|---|---|
| Admin | admin@eventhub.in |
| Organizer | organizer@eventhub.in |
| User | user@eventhub.in |

**Suggested demo flow:** log in as user → pick an event → select tickets → pay (demo) → open QR ticket →
log in as organizer → *Bookings & check-in* → paste the booking code to verify entry (second scan is rejected) →
create a new event → log in as admin → approve it.

## 5. Database schema
Full DDL: `backend/src/database/schema.sql`. Tables: `users`, `categories`, `venues`, `events`, `ticket_types`,
`seats`, `bookings`, `booking_items`, `payments`, `qr_tickets`. All with primary keys, foreign keys and CHECK constraints.
Additions to the suggested design: `categories` (admin-managed), `ticket_types.sold` (inventory counter),
`seats.event_id` (seat status is per event), `bookings.expires_at` (checkout hold).

## 6. How the important requirements are met
- **Auth & roles:** bcrypt (cost 12) password hashes, JWT bearer tokens, `protect` + `authorize('admin'|'organizer')` middleware; accounts re-checked against the DB on every request so suspended users are locked out immediately.
- **No overbooking:** `UPDATE ticket_types SET sold = sold + n WHERE sold + n <= quantity` is atomic, and a DB `CHECK (sold <= quantity)` backs it up. Seats are claimed with `UPDATE seats … WHERE status='available'`.
- **No duplicate bookings:** a user can hold only one pending booking per event (a new attempt replaces the old one and returns its tickets); unpaid holds expire after 10 minutes and are released.
- **Payments:** Razorpay order → checkout → server-side HMAC-SHA256 signature verification → booking confirmed, seats booked, and QR ticket created in a single transaction. Verification is idempotent.
- **QR tickets:** random 192-bit token per booking; QR renders `EVT:<token>`. Verification atomically flips `valid → used`, so the same ticket can't be admitted twice; organizers can only verify their own events.
- **Validation:** `express-validator` on every write route; the same rules are mirrored in the React forms.

## 7. API reference (base `/api`, JSON; 🔒 = Bearer token)
| Method & path | Role | Description |
|---|---|---|
| POST `/auth/register` | public | `{name,email,phone?,password,role?: 'user'\|'organizer'}` |
| POST `/auth/login` | public | `{email,password}` → `{token,user}` |
| GET `/auth/me` · PUT `/auth/profile` · PUT `/auth/password` | 🔒 | profile & password |
| GET `/categories` | public | list categories |
| GET `/events` | public | query: `q, category(slug), city, date(today\|weekend\|week\|YYYY-MM-DD), sort(date\|popular\|price), max_price, featured, page, limit` |
| GET `/events/cities` | public | cities with live events |
| GET `/events/:id` | public* | details, ticket types, seats (*non-approved: owner/admin only) |
| GET `/events/mine` | 🔒 org | own events with revenue |
| POST `/events` | 🔒 org | create (venue + ticket types, optional `is_seated` + `seat_config {rows,cols}`); status `pending` |
| PUT/DELETE `/events/:id` | 🔒 owner/admin | update / remove (cancels + queues refunds if bookings exist) |
| POST `/events/upload-poster` | 🔒 org | multipart `poster` → Cloudinary URL |
| POST `/bookings` | 🔒 | `{event_id, items:[{ticket_type_id,quantity}]}` or `{event_id, seat_ids:[]}` → holds tickets |
| GET `/bookings` · GET `/bookings/:id` | 🔒 | history / detail |
| POST `/bookings/:id/cancel` | 🔒 | cancel (confirmed ones need ≥24 h to start and unused ticket) |
| POST `/payments/order` | 🔒 | `{booking_id}` → Razorpay order (or demo order / free confirmation) |
| POST `/payments/verify` | 🔒 | `{booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature}` |
| GET `/payments/:bookingId` | 🔒 | payment status |
| GET `/tickets/booking/:bookingId` | 🔒 | QR ticket (data-URL PNG) |
| POST `/tickets/verify` | 🔒 org/admin | `{code}` — QR text or booking code |
| GET `/organizer/stats` · `/organizer/bookings` | 🔒 org/admin | revenue, per-event sales, bookings |
| GET `/admin/stats` · `/admin/users` · `/admin/events` · `/admin/bookings` | 🔒 admin | monitoring |
| PATCH `/admin/users/:id` | 🔒 admin | `{role?, is_active?}` |
| PATCH `/admin/events/:id` | 🔒 admin | `{status?: approved\|rejected\|pending, is_featured?}` |
| POST/PUT/DELETE `/admin/categories[/:id]` | 🔒 admin | manage categories |
| GET `/health` | public | status and payment mode |

Errors: `{ "message": "...", "details": [{ "field", "message" }] }` with 400/401/403/404/409/422.

## 8. Going live with real payments
1. Put Razorpay **test** keys in `backend/.env` and restart — checkout switches from demo to the real Razorpay modal (UPI, cards, netbanking). Use Razorpay's test card/UPI details.
2. For production add a Razorpay webhook (`payment.captured`) so bookings confirm even if the user closes the tab after paying.
3. Refunds: cancellation marks payments `refund_pending`. Issue the refund from the Razorpay dashboard, or extend `cancelBooking` with `razorpay.payments.refund()`.

## 9. Known limitations / ideas to extend
Entry check-in is by typed code (add a camera scanner such as `html5-qrcode` to scan the QR); no email/SMS yet; seat layouts are rectangular grids; refunds are queued, not automated.
