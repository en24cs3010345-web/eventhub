const { withTransaction } = require('../config/db');

/** Return a booking's tickets/seats to inventory and set its final status. */
async function releaseBooking(client, bookingId, status) {
  const { rows: b } = await client.query('SELECT status FROM bookings WHERE id=$1 FOR UPDATE', [bookingId]);
  if (!b[0] || ['cancelled', 'expired'].includes(b[0].status)) return false;
  const { rows: items } = await client.query(
    'SELECT ticket_type_id, seat_id, quantity FROM booking_items WHERE booking_id=$1', [bookingId]);
  for (const it of items) {
    await client.query('UPDATE ticket_types SET sold = GREATEST(sold-$1,0) WHERE id=$2', [it.quantity, it.ticket_type_id]);
    if (it.seat_id) await client.query("UPDATE seats SET status='available' WHERE id=$1", [it.seat_id]);
  }
  await client.query('UPDATE bookings SET status=$2 WHERE id=$1', [bookingId, status]);
  return true;
}

/** Free tickets held by unpaid bookings whose hold time ran out. */
async function expireStale() {
  await withTransaction(async (c) => {
    const { rows } = await c.query(
      "SELECT id FROM bookings WHERE status='pending' AND expires_at < NOW() FOR UPDATE SKIP LOCKED");
    for (const r of rows) await releaseBooking(c, r.id, 'expired');
  });
}
module.exports = { releaseBooking, expireStale };
