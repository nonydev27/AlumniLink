import { createApp } from './app.js';
import { config } from './config.js';
import { db, pool } from './db.js';

try {
  await pool.query('select 1');
} catch (err) {
  console.error(`Cannot reach PostgreSQL (${err.message}). Is it running, and is DATABASE_URL correct?`);
  process.exit(1);
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`AlumniLink API listening on http://localhost:${config.port} (${config.env})`);
});

// Housekeeping: forget refresh tokens that expired more than a week ago.
const purge = () =>
  db.run("delete from refresh_tokens where expires_at < now() - interval '7 days'").catch((e) => console.error('Token cleanup failed:', e.message));
purge();
const timer = setInterval(purge, 6 * 60 * 60 * 1000);
timer.unref();

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
