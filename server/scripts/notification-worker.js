import { pathToFileURL } from 'node:url';
import { config } from '../src/config.js';
import { pool } from '../src/db.js';
import { runNotificationWorker } from '../src/modules/v2/notifications/notifications.service.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function main({ once = process.env.NOTIFICATION_WORKER_ONCE === 'true' } = {}) {
  let stopped = false;
  const stop = () => { stopped = true; };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  try {
    do {
      try {
        const result = await runNotificationWorker();
        if (result.claimed) console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
      } catch (error) {
        // A missing adapter is a deployment error: fail fast instead of spinning.
        if (error.status === 503) throw error;
        console.error('notification_batch_failed', error.code || error.message);
      }
      if (once || stopped) break;
      await sleep(config.notificationWorkerPollMs);
    } while (!stopped);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
