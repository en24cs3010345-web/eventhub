const crypto = require('crypto');
class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bookingCode = () => 'EVT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
const qrToken = () => crypto.randomBytes(24).toString('hex');
module.exports = { ApiError, asyncHandler, bookingCode, qrToken };
