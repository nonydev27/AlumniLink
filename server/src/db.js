import pg from 'pg';
import { config } from './config.js';
import { camelizeKeys } from './utils/camel.js';

// COUNT(*) comes back as int8; the numbers here are small, so give callers real numbers, not strings.
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: config.databaseSslRejectUnauthorized } : undefined,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error:', err.message));

// A tiny wrapper so the same code runs on the pool or inside a transaction.
//   all(sql, params) -> array of rows (keys converted to camelCase)
//   one(sql, params) -> first row or null
//   run(sql, params) -> number of affected rows
const wrap = (client) => ({
  all: async (text, params = []) => (await client.query(text, params)).rows.map(camelizeKeys),
  one: async (text, params = []) => {
    const res = await client.query(text, params);
    return res.rows[0] ? camelizeKeys(res.rows[0]) : null;
  },
  run: async (text, params = []) => (await client.query(text, params)).rowCount,
});

export const db = wrap(pool);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(wrap(client));
    await client.query('commit');
    return result;
  } catch (err) {
    try { await client.query('rollback'); } catch { /* connection already broken */ }
    throw err;
  } finally {
    client.release();
  }
}
