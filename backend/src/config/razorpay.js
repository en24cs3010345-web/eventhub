const Razorpay = require('razorpay');
const config = require('./index');
const { keyId, keySecret } = config.razorpay;
const enabled = Boolean(keyId && keySecret);
const client = enabled ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
module.exports = { client, enabled, keyId, keySecret };
