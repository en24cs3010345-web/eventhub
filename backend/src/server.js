const app = require('./app');
const config = require('./config');
const { pool } = require('./config/db');
const rzp = require('./config/razorpay');

pool.query('SELECT 1').then(() => {
  app.listen(config.port, () => {
    console.log(`🚀 API running on http://localhost:${config.port}`);
    console.log(`💳 Payments: ${rzp.enabled ? 'Razorpay' : 'DEMO mode (add Razorpay keys in .env for real checkout)'}`);
  });
}).catch((e) => { console.error('❌ Cannot connect to PostgreSQL:', e.message); process.exit(1); });
