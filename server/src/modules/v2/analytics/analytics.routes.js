import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../utils/http.js';
import { requireV2MemberPrerequisites } from '../middleware.js';

export const analyticsRoutes = Router();
analyticsRoutes.get('/me/analytics', authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites,
  validate({ query: z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }) }),
  asyncHandler(async (req, res) => {
    const { days } = req.valid.query;
    const result = await db.one(
      `with date_range as (
         select (current_date - (n || ' days')::interval)::date as stat_date
         from generate_series($2 - 1, 0, -1) as n
       ), totals as (
         select stat_date, sum(views)::bigint as views,
                sum(search_appearances)::bigint as search_appearances
         from (
           select stat_date, views, search_appearances
           from profile_daily_stats
           where profile_owner_id = $1 and stat_date >= current_date - ($2 - 1)
           union all
           select viewed_on as stat_date, count(*)::bigint as views, 0::bigint as search_appearances
           from profile_view_events
           where profile_owner_id = $1 and viewed_on >= current_date - ($2 - 1)
           group by viewed_on
           union all
           select appeared_on as stat_date, 0::bigint as views, count(*)::bigint as search_appearances
           from profile_search_appearance_events
           where profile_owner_id = $1 and appeared_on >= current_date - ($2 - 1)
           group by appeared_on
         ) events
         group by stat_date
       )
       select coalesce(sum(totals.views), 0)::bigint as views,
              coalesce(sum(totals.search_appearances), 0)::bigint as search_appearances,
              coalesce(jsonb_agg(jsonb_build_object(
                'date', date_range.stat_date,
                'views', coalesce(totals.views, 0),
                'searchAppearances', coalesce(totals.search_appearances, 0)
              ) order by date_range.stat_date), '[]'::jsonb) as daily
       from date_range left join totals using (stat_date)`,
      [req.user.id, days],
    );
    res.json({ data: {
      days,
      views: result.views,
      searchAppearances: result.searchAppearances,
      daily: result.daily,
    } });
  }));
