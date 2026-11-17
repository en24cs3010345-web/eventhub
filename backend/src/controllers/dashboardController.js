const { query } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

// Organizer view: only the signed-in organizer's events (admins see everything)
const scope = (req) => (req.user.role === 'admin' ? ['TRUE', []] : ['e.organizer_id = $1', [req.user.id]]);

exports.organizerStats = asyncHandler(async (req, res) => {
  const [w, p] = scope(req);
  const totals = await query(
    `SELECT COALESCE(SUM(b.total_amount),0) AS revenue, COUNT(DISTINCT b.id)::int AS bookings,
            COALESCE(SUM(bi.q),0)::int AS tickets
     FROM bookings b JOIN events e ON e.id=b.event_id
     LEFT JOIN LATERAL (SELECT SUM(quantity) q FROM booking_items WHERE booking_id=b.id) bi ON TRUE
     WHERE b.status='confirmed' AND ${w}`, p);
  const events = await query(`SELECT COUNT(*)::int AS n FROM events e WHERE ${w}`, p);
  const daily = await query(
    `SELECT to_char(d::date,'DD Mon') AS day, COALESCE(SUM(b.total_amount),0) AS revenue
     FROM generate_series(CURRENT_DATE-13, CURRENT_DATE, '1 day') d
     LEFT JOIN (SELECT b.* FROM bookings b JOIN events e ON e.id=b.event_id WHERE b.status='confirmed' AND ${w}) b ON b.created_at::date = d::date
     GROUP BY d ORDER BY d`, p);
  const perEvent = await query(
    `SELECT e.id, e.title, e.status, COALESCE(SUM(b.total_amount) FILTER (WHERE b.status='confirmed'),0) AS revenue,
            COUNT(b.id) FILTER (WHERE b.status='confirmed')::int AS bookings,
            COALESCE((SELECT SUM(sold) FROM ticket_types WHERE event_id=e.id),0)::int AS sold,
            COALESCE((SELECT SUM(quantity) FROM ticket_types WHERE event_id=e.id),0)::int AS capacity
     FROM events e LEFT JOIN bookings b ON b.event_id=e.id WHERE ${w} GROUP BY e.id ORDER BY revenue DESC`, p);
  res.json({ ...totals.rows[0], events: events.rows[0].n, daily: daily.rows, perEvent: perEvent.rows });
});

exports.organizerBookings = asyncHandler(async (req, res) => {
  const [w, p] = scope(req);
  let extra = '';
  if (req.query.event_id) { p.push(req.query.event_id); extra = ` AND e.id = $${p.length}`; }
  const { rows } = await query(
    `SELECT b.id, b.booking_code, b.total_amount, b.status, b.created_at, e.title, u.name AS customer, u.email,
            q.verification_status, COALESCE((SELECT SUM(quantity) FROM booking_items WHERE booking_id=b.id),0)::int AS tickets
     FROM bookings b JOIN events e ON e.id=b.event_id JOIN users u ON u.id=b.user_id LEFT JOIN qr_tickets q ON q.booking_id=b.id
     WHERE b.status IN ('confirmed','cancelled') AND ${w}${extra} ORDER BY b.created_at DESC LIMIT 200`, p);
  res.json({ bookings: rows });
});
