const { query, withTransaction } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { expireStale, releaseBooking } = require('../services/inventory');
const { cloudinary, enabled: cloudOn } = require('../config/cloudinary');

const BASE = `
  FROM events e
  JOIN venues v ON v.id = e.venue_id
  JOIN categories c ON c.id = e.category_id
  LEFT JOIN LATERAL (
    SELECT MIN(price) AS min_price, COALESCE(SUM(quantity - sold),0)::int AS available, COALESCE(SUM(sold),0)::int AS sold
    FROM ticket_types WHERE event_id = e.id) t ON TRUE`;
const CARD = `e.id, e.title, e.poster_url, e.event_date, e.event_time, e.is_featured, e.is_seated, e.status,
  c.name AS category, c.slug AS category_slug, c.icon AS category_icon,
  v.name AS venue_name, v.city, t.min_price, t.available, t.sold`;

exports.listCategories = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY name');
  res.json({ categories: rows });
});

exports.listEvents = asyncHandler(async (req, res) => {
  const { q, category, city, date, sort = 'date', featured, max_price } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 12, 60);
  const where = ["e.status='approved'", "e.event_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date"];
  const p = [];
  const add = (v) => { p.push(v); return `$${p.length}`; };
  if (q) { const s = add(`%${q}%`); where.push(`(e.title ILIKE ${s} OR e.description ILIKE ${s} OR v.name ILIKE ${s})`); }
  if (category) where.push(`c.slug = ${add(category)}`);
  if (city) where.push(`v.city ILIKE ${add(city)}`);
  if (featured === 'true') where.push('e.is_featured = TRUE');
  if (max_price !== undefined && max_price !== '') where.push(`t.min_price <= ${add(Number(max_price))}`);
  if (date === 'today') where.push("e.event_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date");
  else if (date === 'week') where.push("e.event_date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date + 7");
  else if (date === 'weekend') where.push("e.event_date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date + 7 AND EXTRACT(DOW FROM e.event_date) IN (0,6)");
  else if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) where.push(`e.event_date = ${add(date)}`);
  const order = { price: 't.min_price ASC NULLS LAST', popular: 't.sold DESC', date: 'e.event_date, e.event_time' }[sort] || 'e.event_date, e.event_time';
  p.push(limit, (page - 1) * limit);
  const { rows } = await query(
    `SELECT ${CARD}, COUNT(*) OVER() AS total ${BASE} WHERE ${where.join(' AND ')}
     ORDER BY ${order} LIMIT $${p.length - 1} OFFSET $${p.length}`, p);
  const total = rows[0] ? Number(rows[0].total) : 0;
  res.json({ events: rows.map(({ total: _t, ...r }) => r), total, page, pages: Math.ceil(total / limit) });
});

exports.getCities = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT DISTINCT v.city FROM venues v JOIN events e ON e.venue_id=v.id WHERE e.status='approved' ORDER BY v.city");
  res.json({ cities: rows.map((r) => r.city) });
});

exports.getEvent = asyncHandler(async (req, res) => {
  await expireStale();
  const { rows } = await query(
    `SELECT e.*, c.name AS category, c.slug AS category_slug, c.icon AS category_icon,
            v.name AS venue_name, v.address, v.city, v.state, v.capacity, u.name AS organizer_name
     FROM events e JOIN venues v ON v.id=e.venue_id JOIN categories c ON c.id=e.category_id
     JOIN users u ON u.id=e.organizer_id WHERE e.id=$1`, [req.params.id]);
  const ev = rows[0];
  const privileged = req.user && (req.user.role === 'admin' || req.user.id === ev?.organizer_id);
  if (!ev || (ev.status !== 'approved' && !privileged)) throw new ApiError(404, 'Event not found');
  const types = await query(
    'SELECT id,name,price,quantity,sold,(quantity-sold) AS available FROM ticket_types WHERE event_id=$1 ORDER BY price DESC', [ev.id]);
  ev.ticket_types = types.rows;
  if (ev.is_seated) {
    ev.seats = (await query(
      'SELECT id,seat_number,status,ticket_type_id FROM seats WHERE event_id=$1 ORDER BY LENGTH(seat_number), seat_number', [ev.id])).rows;
  }
  res.json({ event: ev });
});

const rowLabel = (i) => String.fromCharCode(65 + i);

exports.createEvent = asyncHandler(async (req, res) => {
  const b = req.body;
  const id = await withTransaction(async (c) => {
    const v = await c.query('INSERT INTO venues(name,address,city,state,capacity) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [b.venue.name, b.venue.address, b.venue.city, b.venue.state || null, b.venue.capacity]);
    const e = await c.query(
      `INSERT INTO events(organizer_id,category_id,venue_id,title,description,poster_url,event_date,event_time,is_seated)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user.id, b.category_id, v.rows[0].id, b.title, b.description, b.poster_url || null, b.event_date, b.event_time, !!b.is_seated]);
    const eventId = e.rows[0].id;
    if (b.is_seated) {
      const R = b.seat_config.rows, C = b.seat_config.cols, T = b.ticket_types.length;
      const per = Math.ceil(R / T);
      for (let t = 0; t < T; t++) {
        const rows = []; for (let r = t * per; r < Math.min(R, (t + 1) * per); r++) rows.push(r);
        const tt = await c.query('INSERT INTO ticket_types(event_id,name,price,quantity) VALUES($1,$2,$3,$4) RETURNING id',
          [eventId, b.ticket_types[t].name, b.ticket_types[t].price, rows.length * C]);
        for (const r of rows) for (let col = 1; col <= C; col++)
          await c.query('INSERT INTO seats(venue_id,event_id,ticket_type_id,seat_number) VALUES($1,$2,$3,$4)',
            [v.rows[0].id, eventId, tt.rows[0].id, `${rowLabel(r)}${col}`]);
      }
    } else {
      for (const t of b.ticket_types)
        await c.query('INSERT INTO ticket_types(event_id,name,price,quantity) VALUES($1,$2,$3,$4)', [eventId, t.name, t.price, t.quantity]);
    }
    return eventId;
  });
  res.status(201).json({ id, message: 'Event submitted for admin approval' });
});

async function ownEvent(req) {
  const { rows } = await query('SELECT * FROM events WHERE id=$1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Event not found');
  if (req.user.role !== 'admin' && rows[0].organizer_id !== req.user.id) throw new ApiError(403, 'This is not your event');
  return rows[0];
}

exports.updateEvent = asyncHandler(async (req, res) => {
  const ev = await ownEvent(req);
  const b = req.body;
  await withTransaction(async (c) => {
    await c.query(
      `UPDATE events SET title=$1, description=$2, category_id=$3, event_date=$4, event_time=$5, poster_url=$6,
         status = CASE WHEN status='rejected' THEN 'pending' ELSE status END WHERE id=$7`,
      [b.title, b.description, b.category_id, b.event_date, b.event_time, b.poster_url || null, ev.id]);
    await c.query('UPDATE venues SET name=$1,address=$2,city=$3,state=$4,capacity=$5 WHERE id=$6',
      [b.venue.name, b.venue.address, b.venue.city, b.venue.state || null, b.venue.capacity, ev.venue_id]);
    for (const t of b.ticket_types) {
      if (t.id) {
        const cur = await c.query('SELECT sold FROM ticket_types WHERE id=$1 AND event_id=$2 FOR UPDATE', [t.id, ev.id]);
        if (!cur.rowCount) continue;
        const qty = ev.is_seated ? undefined : t.quantity;
        if (qty !== undefined && qty < cur.rows[0].sold) throw new ApiError(409, `"${t.name}": ${cur.rows[0].sold} already sold, quantity can't go lower`);
        await c.query('UPDATE ticket_types SET name=$1, price=$2, quantity=COALESCE($3, quantity) WHERE id=$4', [t.name, t.price, qty ?? null, t.id]);
      } else if (!ev.is_seated) {
        await c.query('INSERT INTO ticket_types(event_id,name,price,quantity) VALUES($1,$2,$3,$4)', [ev.id, t.name, t.price, t.quantity]);
      }
    }
  });
  res.json({ message: 'Event updated' });
});

exports.deleteEvent = asyncHandler(async (req, res) => {
  const ev = await ownEvent(req);
  const out = await withTransaction(async (c) => {
    const { rows: bk } = await c.query("SELECT id,status FROM bookings WHERE event_id=$1", [ev.id]);
    if (!bk.length) { await c.query('DELETE FROM events WHERE id=$1', [ev.id]); return 'deleted'; }
    for (const b of bk) {
      if (b.status === 'confirmed') {
        await c.query("UPDATE payments SET status='refund_pending' WHERE booking_id=$1 AND status='paid'", [b.id]);
        await c.query("UPDATE qr_tickets SET verification_status='cancelled' WHERE booking_id=$1", [b.id]);
      }
      await releaseBooking(c, b.id, 'cancelled');
    }
    await c.query("UPDATE events SET status='cancelled' WHERE id=$1", [ev.id]);
    return 'cancelled';
  });
  res.json({ message: out === 'deleted' ? 'Event deleted' : 'Event cancelled. Existing bookings were cancelled and queued for refund.' });
});

exports.myEvents = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT ${CARD}, COALESCE((SELECT SUM(total_amount) FROM bookings WHERE event_id=e.id AND status='confirmed'),0) AS revenue
     ${BASE} WHERE e.organizer_id=$1 ORDER BY e.event_date DESC`, [req.user.id]);
  res.json({ events: rows });
});

exports.uploadPoster = asyncHandler(async (req, res) => {
  if (!cloudOn) throw new ApiError(503, 'Image upload is not configured. Paste an image link instead.');
  if (!req.file) throw new ApiError(400, 'Choose an image file (JPG, PNG or WebP, up to 5 MB)');
  const url = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'eventhub/posters' }, (err, r) => (err ? reject(err) : resolve(r.secure_url)))
      .end(req.file.buffer);
  });
  res.json({ url });
});
