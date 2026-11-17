const QRCode = require('qrcode');
const { query } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/helpers');

exports.getTicket = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.id AS booking_id, b.booking_code, b.total_amount, b.user_id, q.qr_token, q.verification_status,
            e.title, e.event_date, e.event_time, v.name AS venue_name, v.address, v.city, u.name AS holder,
            COALESCE((SELECT json_agg(json_build_object('name',tt.name,'quantity',bi.quantity,'seat',s.seat_number))
              FROM booking_items bi JOIN ticket_types tt ON tt.id=bi.ticket_type_id LEFT JOIN seats s ON s.id=bi.seat_id
              WHERE bi.booking_id=b.id),'[]') AS items
     FROM bookings b JOIN qr_tickets q ON q.booking_id=b.id JOIN events e ON e.id=b.event_id
     JOIN venues v ON v.id=e.venue_id JOIN users u ON u.id=b.user_id
     WHERE b.id=$1 AND b.status IN ('confirmed','cancelled')`, [req.params.bookingId]);
  const t = rows[0];
  if (!t || (t.user_id !== req.user.id && req.user.role !== 'admin')) throw new ApiError(404, 'Ticket not found');
  const qr = await QRCode.toDataURL(`EVT:${t.qr_token}`, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
  const { qr_token, user_id, ...ticket } = t;
  res.json({ ticket: { ...ticket, qr } });
});

/** Entry check. Accepts the scanned QR text ("EVT:<token>") or the booking code typed by staff. */
exports.verifyTicket = asyncHandler(async (req, res) => {
  const raw = String(req.body.code || '').trim();
  const token = raw.replace(/^EVT:/i, '');
  const { rows } = await query(
    `SELECT q.id, q.verification_status, q.verified_at, b.booking_code, b.status AS booking_status, e.id AS event_id, e.title,
            e.organizer_id, u.name AS holder,
            COALESCE((SELECT SUM(quantity) FROM booking_items WHERE booking_id=b.id),0)::int AS tickets,
            COALESCE((SELECT string_agg(s.seat_number, ', ') FROM booking_items bi JOIN seats s ON s.id=bi.seat_id WHERE bi.booking_id=b.id),'') AS seats
     FROM qr_tickets q JOIN bookings b ON b.id=q.booking_id JOIN events e ON e.id=b.event_id JOIN users u ON u.id=b.user_id
     WHERE q.qr_token=$1 OR UPPER(b.booking_code)=UPPER($1)`, [token]);
  const t = rows[0];
  if (!t) throw new ApiError(404, 'Invalid ticket. No booking matches this code.');
  if (req.user.role !== 'admin' && t.organizer_id !== req.user.id) throw new ApiError(403, 'This ticket belongs to another organizer’s event');
  const info = { booking_code: t.booking_code, event: t.title, holder: t.holder, tickets: t.tickets, seats: t.seats };
  if (t.verification_status === 'cancelled') return res.status(400).json({ message: 'This ticket was cancelled', ...info });
  if (t.verification_status === 'used') return res.status(409).json({ message: 'Already used for entry', verified_at: t.verified_at, ...info });
  // Atomic flip valid -> used so two scanners can't both admit the same ticket
  const upd = await query("UPDATE qr_tickets SET verification_status='used', verified_at=NOW(), verified_by=$2 WHERE id=$1 AND verification_status='valid' RETURNING id", [t.id, req.user.id]);
  if (!upd.rowCount) return res.status(409).json({ message: 'Already used for entry', ...info });
  res.json({ message: 'Valid ticket. Entry allowed.', ...info });
});
