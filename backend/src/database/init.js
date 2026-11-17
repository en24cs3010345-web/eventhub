const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
(async () => {
  try {
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('✅ Database schema created');
  } catch (e) { console.error('❌', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
