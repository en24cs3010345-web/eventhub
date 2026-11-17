const { query, withTransaction } = require('../config/db');
const config = require('../config');
const { ApiError, asyncHandler, bookingCode } = require('../utils/helpers');
const { expireStale, releaseBooking } = require('../services/inventory');

exports.createBooking = asyncHandler(async (req, res) => {
  await expireStale();
  const { event_id, items = [], seat_ids = [] } = req.body;
  const booking = await withTransaction(async (c) => {
    const ev = (await c.query("SELECT id,status,is_seated,((event_date + event_time) < (NOW() AT TIME ZONE 'Asia/Kolkata')) AS started FROM events WHERE id=$1", [event_id])).rows[0];
    if (!ev || ev.status !== 'approved') throw new ApiError(404, 'This event is not open for booking');
    if (ev.started) throw new ApiError(409, 'This event has already started');

    // Duplicate-booking guard: replace any unpaid booking this user already holds for this event
    const old = await c.query("SELECT id FROM bookings WHERE user_id=$1 AND event_id=$2 AND status='pending'", [req.user.id, event_id]);
    for (const o of old.rows) await releaseBooking(c, o.id, 'cancelled');

    const lines = []; // {ticket_type_id, seat_id, quantity, price}
    if (ev.is_seated) {
      if (!seat_ids.length) throw new ApiError(422, 'Select at least one seat');
      if (seat_ids.length > config.maxTicketsPerBooking) throw new ApiError(422, `You can book up to ${config.maxTicketsPerBooking} seats at a time`);
      const held = await c.query(
        "UPDATE seats SET status='held' WHERE id = ANY($1::int[]) AND event_id=$2 AND status='available' RETURNING id, ticket_type_id",
        [seat_ids, event_id]);
      if (held.rowCount !== new Set(seat_ids).size) throw new ApiError(409, 'Some seats were just taken. Please pick different seats.');
      for (const s of held.rows) {
        const t = await c.query('UPDATE ticket_types SET sold=sold+1 WHERE id=$1 RETURNING price', [s.ticket_type_id]);
        lines.push({ ticket_type_id: s.ticket_type_id, seat_id: s.id, quantity: 1, price: t.rows[0].price });
      }
    } else {
      const total = items.reduce((a, i) => a + i.quantity, 0);
      if (!total) throw new ApiError(422, 'Select at least one ticket');
      if (total > config.maxTicketsPerBooking) throw new ApiError(422, `You can book up to ${config.maxTicketsPerBooking} tickets at a time`);
      for (const i of items) {
        // Atomic guard: the UPDATE only succeeds while stock remains, so concurrent requests can't oversell
        const t = await c.query(
          'UPDATE ticket_types SET sold=sold+$1 WHERE id=$2 AND event_id=$3 AND sold+$1 <= quantity RETURNING price',
          [i.quantity, i.ticket_type_id, event_id]);
        if (!t.rowCount) throw new ApiError(409, 'Not enough tickets left for one of your selections');
        lines.push({ ticket_type_id: i.ticket_type_id, seat_id: null, quantity: i.quantity, price: t.rows[0].price });
      }
    }
    const amount = lines.reduce((a, l) => a + Number(l.price) * l.quantity, 0);
    const b = await c.query(
      `INSERT INTO bookings(user_id,event_id,booking_code,total_amount,expires_at)
       VALUES($1,$2,$3,$4, NOW() + ($5 || ' minutes')::interval) RETURNING *`,
      [req.user.id, event_id, bookingCode(), amount, String(config.holdMinutes)]);
    for (const l of lines)
      await c.query('INSERT INTO booking_items(booking_id,ticket_type_id,seat_id,quantity,price) VALUES($1,$2,$3,$4,$5)',
        [b.rows[0].id, l.ticket_type_id, l.seat_id, l.quantity, l.price]);
    return b.rows[0];
  });
  res.status(201).json({ booking });
});

const SELECT = `
  SELECT b.*, e.title, e.poster_url, e.event_date, e.event_time, e.status AS event_status, v.name AS venue_name, v.city,
         c.slug AS category_slug, p.status AS payment_status,
         (b.status='confirmed' AND (e.event_date + e.event_time) > (NOW() AT TIME ZONE 'Asia/Kolkata') + ($1 || ' hours')::interval
            AND COALESCE(q.verification_status,'valid')='valid') AS can_cancel,
         COALESCE((SELECT json_agg(json_build_object('name',tt.name,'quantity',bi.quantity,'price',bi.price,'seat',s.seat_number))
                   FROM booking_items bi JOIN ticket_types tt ON tt.id=bi.ticket_type_id LEFT JOIN seats s ON s.id=bi.seat_id
                   WHERE bi.booking_id=b.id), '[]') AS items
  FROM bookings b JOIN events e ON e.id=b.event_id JOIN venues v ON v.id=e.venue_id JOIN categories c ON c.id=e.category_id
  LEFT JOIN payments p ON p.booking_id=b.id LEFT JOIN qr_tickets q ON q.booking_id=b.id`;

exports.myBookings = asyncHandler(async (req, res) => {
  await expireStale();
  const { rows } = await query(`${SELECT} WHERE b.user_id=$2 AND b.status <> 'expired' ORDER BY b.created_at DESC`,
    [String(config.cancelHours), req.user.id]);
  res.json({ bookings: rows });
});

exports.getBooking = asyncHandler(async (req, res) => {
  await expireStale();
  const { rows } = await query(`${SELECT} WHERE b.id=$2`, [String(config.cancelHours), req.params.id]);
  const b = rows[0];
  if (!b || (b.user_id !== req.user.id && req.user.role !== 'admin')) throw new ApiError(404, 'Booking not found');
  res.json({ booking: b });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE b.id=$2 AND b.user_id=$3`, [String(config.cancelHours), req.params.id, req.user.id]);
  const b = rows[0];
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status === 'pending') {
    await withTransaction((c) => releaseBooking(c, b.id, 'cancelled'));
    return res.json({ message: 'Booking cancelled' });
  }
  if (!b.can_cancel) throw new ApiError(409, `Bookings can only be cancelled at least ${config.cancelHours} hours before the event, and before entry scan`);
  await withTransaction(async (c) => {
    await c.query("UPDATE payments SET status='refund_pending' WHERE booking_id=$1 AND status='paid'", [b.id]);
    await c.query("UPDATE qr_tickets SET verification_status='cancelled' WHERE booking_id=$1", [b.id]);
    await releaseBooking(c, b.id, 'cancelled');
  });
  res.json({ message: 'Booking cancelled. Your refund will be processed to the original payment method.' });
});
