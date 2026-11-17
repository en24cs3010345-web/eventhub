const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../config/db');
const { ApiError, asyncHandler } = require('../utils/helpers');

async function load(req, required) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) { if (required) throw new ApiError(401, 'Please log in to continue'); return; }
  let payload;
  try { payload = jwt.verify(token, config.jwtSecret); }
  catch { if (required) throw new ApiError(401, 'Session expired. Please log in again'); return; }
  const { rows } = await query('SELECT id,name,email,phone,role,is_active FROM users WHERE id=$1', [payload.id]);
  if (!rows[0] || !rows[0].is_active) { if (required) throw new ApiError(401, 'This account is not available'); return; }
  req.user = rows[0];
}
const protect = asyncHandler(async (req, res, next) => { await load(req, true); next(); });
const optionalAuth = asyncHandler(async (req, res, next) => { await load(req, false); next(); });
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have access to this action'));
module.exports = { protect, optionalAuth, authorize };
