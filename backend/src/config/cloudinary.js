const cloudinary = require('cloudinary').v2;
const config = require('./index');
const c = config.cloudinary;
const enabled = Boolean(c.cloud_name && c.api_key && c.api_secret);
if (enabled) cloudinary.config({ ...c, secure: true });
module.exports = { cloudinary, enabled };
