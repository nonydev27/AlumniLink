import { pathToFileURL } from 'node:url';
import { config } from '../src/config.js';
import { pool, tx } from '../src/db.js';

export async function runRollupOnce() {
  return tx(async (t) => {
    const rolled = await t.run(
      `insert into profile_daily_stats
         (profile_owner_id, stat_date, views, search_appearances, updated_at)
       select profile_owner_id, stat_date, sum(views), sum(search_appearances), now()
       from (
         select profile_owner_id, viewed_on as stat_date, count(*)::bigint as views,
                0::bigint as search_appearances
         from profile_view_events
         where created_at < now() - interval '30 days'
         group by profile_owner_id, viewed_on
         union all
         select profile_owner_id, appeared_on as stat_date, 0::bigint as views,
                count(*)::bigint as search_appearances
         from profile_search_appearance_events
         where created_at < now() - interval '30 days'
         group by profile_owner_id, appeared_on
       ) raw_events
       group by profile_owner_id, stat_date
       on conflict (profile_owner_id, stat_date) do update
       set views = profile_daily_stats.views + excluded.views,
           search_appearances = profile_daily_stats.search_appearances + excluded.search_appearances,
           updated_at = now()`,
    );
    const oldViews = await t.run(
      "delete from profile_view_events where created_at < now() - interval '30 days'",
    );
    const oldSearches = await t.run(
      "delete from profile_search_appearance_events where created_at < now() - interval '30 days'",
    );
    return { rolled, deletedViewEvents: oldViews, deletedSearchEvents: oldSearches };
  });
}

export async function main({
  once = process.env.ANALYTICS_ROLLUP_ONCE === 'true',
  intervalMs = config.analyticsRollupIntervalMs,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let stopped = false;
  const stop = () => { stopped = true; };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);

  try {
    do {
      try {
        const result = await runRollupOnce();
        if (result.rolled || result.deletedViewEvents || result.deletedSearchEvents) {
          console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
        }
      } catch (error) {
        console.error('analytics_rollup_failed', error.code || error.message);
      }
      if (once || stopped) break;
      await sleep(intervalMs);
    } while (!stopped);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
