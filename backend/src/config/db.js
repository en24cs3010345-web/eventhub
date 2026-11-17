const { Pool, types } = require('pg');
types.setTypeParser(1082, (v) => v); // keep DATE columns as 'YYYY-MM-DD' strings (no timezone shift)
types.setTypeParser(1700, (v) => v); // NUMERIC as string for exact money handling
const config = require('./index');

const pool = new Pool({ connectionString: config.databaseUrl });
pool.on('error', (e) => console.error('Unexpected PG error', e));

const query = (text, params) => pool.query(text, params);

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { pool, query, withTransaction };
