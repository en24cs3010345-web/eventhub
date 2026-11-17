const { query } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/helpers');

exports.stats = asyncHandler(async (req, res) => {
  const one = async (sql) => (await query(sql)).rows[0];
  const users = await one("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE role='organizer')::int organizers FROM users");
  const events = await one("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='pending')::int pending, COUNT(*) FILTER (WHERE status='approved')::int approved FROM events");
  const bookings = await one("SELECT COUNT(*) FILTER (WHERE status='confirmed')::int confirmed, COALESCE(SUM(total_amount) FILTER (WHERE status='confirmed'),0) revenue FROM bookings");
  const byCategory = (await query(
    `SELECT c.name, COUNT(DISTINCT e.id)::int events, COALESCE(SUM(b.total_amount) FILTER (WHERE b.status='confirmed'),0) revenue
     FROM categories c LEFT JOIN events e ON e.category_id=c.id LEFT JOIN bookings b ON b.event_id=e.id GROUP BY c.id ORDER BY revenue DESC`)).rows;
  const daily = (await query(
    `SELECT to_char(d::date,'DD Mon') day, COALESCE(SUM(b.total_amount),0) revenue
     FROM generate_series(CURRENT_DATE-13, CURRENT_DATE, '1 day') d
     LEFT JOIN bookings b ON b.created_at::date=d::date AND b.status='confirmed' GROUP BY d ORDER BY d`)).rows;
  res.json({ users, events, bookings, byCategory, daily });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const p = [], w = [];
  if (req.query.role) { p.push(req.query.role); w.push(`role=$${p.length}`); }
  if (req.query.q) { p.push(`%${req.query.q}%`); w.push(`(name ILIKE $${p.length} OR email ILIKE $${p.length})`); }
  const { rows } = await query(`SELECT id,name,email,phone,role,is_active,created_at FROM users ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 200`, p);
  res.json({ users: rows });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw new ApiError(400, 'You cannot change your own role or status');
  const { role, is_active } = req.body;
  const { rows } = await query(
    'UPDATE users SET role=COALESCE($1,role), is_active=COALESCE($2,is_active) WHERE id=$3 RETURNING id,name,email,role,is_active',
    [role ?? null, is_active ?? null, req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'User not found');
  res.json({ user: rows[0] });
});

exports.listEvents = asyncHandler(async (req, res) => {
  const p = [], w = [];
  if (req.query.status) { p.push(req.query.status); w.push(`e.status=$${p.length}`); }
  const { rows } = await query(
    `SELECT e.id,e.title,e.status,e.is_featured,e.event_date,e.created_at,c.name category,v.city,u.name organizer
     FROM events e JOIN categories c ON c.id=e.category_id JOIN venues v ON v.id=e.venue_id JOIN users u ON u.id=e.organizer_id
     ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY (e.status='pending') DESC, e.created_at DESC LIMIT 200`, p);
  res.json({ events: rows });
});

exports.moderateEvent = asyncHandler(async (req, res) => {
  const { status, is_featured } = req.body;
  const { rows } = await query(
    'UPDATE events SET status=COALESCE($1,status), is_featured=COALESCE($2,is_featured) WHERE id=$3 RETURNING id,status,is_featured',
    [status ?? null, is_featured ?? null, req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Event not found');
  res.json({ event: rows[0] });
});

exports.listBookings = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.id,b.booking_code,b.total_amount,b.status,b.created_at,e.title,u.name customer,p.status payment_status
     FROM bookings b JOIN events e ON e.id=b.event_id JOIN users u ON u.id=b.user_id LEFT JOIN payments p ON p.booking_id=b.id
     WHERE b.status <> 'expired' ORDER BY b.created_at DESC LIMIT 200`);
  res.json({ bookings: rows });
});

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
exports.createCategory = asyncHandler(async (req, res) => {
  const { rows } = await query('INSERT INTO categories(name,slug,icon) VALUES($1,$2,$3) RETURNING *',
    [req.body.name.trim(), slugify(req.body.name), req.body.icon || '🎟️']);
  res.status(201).json({ category: rows[0] });
});
exports.updateCategory = asyncHandler(async (req, res) => {
  const { rows } = await query('UPDATE categories SET name=$1, slug=$2, icon=$3 WHERE id=$4 RETURNING *',
    [req.body.name.trim(), slugify(req.body.name), req.body.icon || '🎟️', req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Category not found');
  res.json({ category: rows[0] });
});
exports.deleteCategory = asyncHandler(async (req, res) => {
  const used = await query('SELECT 1 FROM events WHERE category_id=$1 LIMIT 1', [req.params.id]);
  if (used.rowCount) throw new ApiError(409, 'Events still use this category. Move them first.');
  await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
  res.json({ message: 'Category deleted' });
});
