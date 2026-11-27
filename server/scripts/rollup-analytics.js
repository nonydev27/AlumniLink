import { pathToFileURL } from 'node:url';
import { pool, tx } from '../src/db.js';

export async function main() {
  try {
    const result = await tx(async (t) => {
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
    console.log(JSON.stringify(result));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
