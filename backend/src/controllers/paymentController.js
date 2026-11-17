const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const rzp = require('../config/razorpay');
const { ApiError, asyncHandler, qrToken } = require('../utils/helpers');
const { expireStale } = require('../services/inventory');

async function myPendingBooking(req, id) {
  await expireStale();
  const { rows } = await query('SELECT * FROM bookings WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  const b = rows[0];
  if (!b) throw new ApiError(404, 'Booking not found');
  if (b.status === 'confirmed') return b;
  if (b.status !== 'pending') throw new ApiError(409, 'This booking has expired or was cancelled. Please select tickets again.');
  return b;
}

/** Marks a pending booking paid, confirms seats and issues the QR ticket — all in one transaction. */
async function confirmBooking(c, booking, paymentId) {
  await c.query("UPDATE payments SET status='paid', transaction_id=$2, paid_at=NOW() WHERE booking_id=$1", [booking.id, paymentId]);
  await c.query("UPDATE bookings SET status='confirmed', expires_at=NULL WHERE id=$1", [booking.id]);
  await c.query("UPDATE seats SET status='booked' WHERE id IN (SELECT seat_id FROM booking_items WHERE booking_id=$1 AND seat_id IS NOT NULL)", [booking.id]);
  await c.query('INSERT INTO qr_tickets(booking_id,qr_token) VALUES($1,$2) ON CONFLICT (booking_id) DO NOTHING', [booking.id, qrToken()]);
}

exports.createOrder = asyncHandler(async (req, res) => {
  const b = await myPendingBooking(req, req.body.booking_id);
  if (b.status === 'confirmed') return res.json({ already_paid: true });
  const amount = Number(b.total_amount);
  let orderId, demo = !rzp.enabled;
  if (amount === 0) {
    await withTransaction(async (c) => {
      await c.query(`INSERT INTO payments(booking_id,amount,razorpay_order_id) VALUES($1,0,'free') ON CONFLICT (booking_id) DO NOTHING`, [b.id]);
      await confirmBooking(c, b, 'free');
    });
    return res.json({ free: true });
  }
  if (demo) orderId = `order_demo_${b.booking_code}`;
  else {
    const order = await rzp.client.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: b.booking_code });
    orderId = order.id;
  }
  await query(
    `INSERT INTO payments(booking_id,amount,razorpay_order_id) VALUES($1,$2,$3)
     ON CONFLICT (booking_id) DO UPDATE SET razorpay_order_id=EXCLUDED.razorpay_order_id, amount=EXCLUDED.amount WHERE payments.status <> 'paid'`,
    [b.id, amount, orderId]);
  res.json({ order_id: orderId, amount: Math.round(amount * 100), currency: 'INR', key_id: rzp.keyId || null, demo, booking_code: b.booking_code });
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const b = await myPendingBooking(req, booking_id);
  if (b.status === 'confirmed') return res.json({ message: 'Already confirmed', booking_id: b.id });
  const pay = (await query('SELECT * FROM payments WHERE booking_id=$1', [b.id])).rows[0];
  if (!pay || pay.razorpay_order_id !== razorpay_order_id) throw new ApiError(400, 'Payment order mismatch');
  if (rzp.enabled) {
    const expected = crypto.createHmac('sha256', rzp.keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    const ok = razorpay_signature && expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!ok) {
      await query("UPDATE payments SET status='failed' WHERE booking_id=$1 AND status='created'", [b.id]);
      throw new ApiError(400, 'Payment verification failed');
    }
  } else if (!razorpay_order_id.startsWith('order_demo_')) throw new ApiError(400, 'Invalid demo payment');
  await withTransaction((c) => confirmBooking(c, b, razorpay_payment_id || `pay_demo_${Date.now()}`));
  res.json({ message: 'Payment successful', booking_id: b.id });
});

exports.paymentStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.* FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.booking_id=$1 AND b.user_id=$2`, [req.params.bookingId, req.user.id]);
  if (!rows[0]) throw new ApiError(404, 'No payment found for this booking');
  res.json({ payment: rows[0] });
});
