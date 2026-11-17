require('dotenv').config();
const n = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
module.exports = {
  port: n(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpay: { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
  holdMinutes: n(process.env.BOOKING_HOLD_MINUTES, 10),
  cancelHours: n(process.env.CANCELLATION_HOURS_BEFORE, 24),
  maxTicketsPerBooking: 10,
};
