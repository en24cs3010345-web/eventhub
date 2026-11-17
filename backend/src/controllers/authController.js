const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/helpers');

const sign = (u) => jwt.sign({ id: u.id, role: u.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const role = req.body.role === 'organizer' ? 'organizer' : 'user'; // admin cannot self-register
  const exists = await query('SELECT 1 FROM users WHERE email=$1', [email.toLowerCase()]);
  if (exists.rowCount) throw new ApiError(409, 'An account with this email already exists');
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await query(
    'INSERT INTO users(name,email,phone,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [name.trim(), email.toLowerCase(), phone || null, hash, role]);
  res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
});

exports.login = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE email=$1', [req.body.email.toLowerCase()]);
  const u = rows[0];
  const ok = u && (await bcrypt.compare(req.body.password, u.password_hash));
  if (!ok) throw new ApiError(401, 'Incorrect email or password');
  if (!u.is_active) throw new ApiError(403, 'This account has been suspended');
  res.json({ token: sign(u), user: publicUser(u) });
});

exports.me = asyncHandler(async (req, res) => res.json({ user: publicUser(req.user) }));

exports.updateProfile = asyncHandler(async (req, res) => {
  const { rows } = await query('UPDATE users SET name=$1, phone=$2 WHERE id=$3 RETURNING *',
    [req.body.name.trim(), req.body.phone || null, req.user.id]);
  res.json({ user: publicUser(rows[0]) });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!(await bcrypt.compare(req.body.currentPassword, rows[0].password_hash)))
    throw new ApiError(400, 'Current password is incorrect');
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(req.body.newPassword, 12), req.user.id]);
  res.json({ message: 'Password updated' });
});
