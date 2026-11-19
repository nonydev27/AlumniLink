import { Router } from 'express';
import { db } from '../../db.js';
import { authenticate, requireRole, requireVerified } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/http.js';
import { loadProfileRow } from '../me/me.service.js';
import { getMentorSuggestions, getOpportunitySuggestions } from '../ai/ai.service.js';
import { toOpportunity } from '../shared/serializers.js';
import { NOT_BLOCKED } from '../shared/sql.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(authenticate, requireRole('student', 'alumni'));

// One call for the dashboard page: counters, upcoming opportunities and (if enabled) AI suggestions.
dashboardRoutes.get('/', asyncHandler(async (req, res) => {
  const me = req.user;
  const verified = me.verificationStatus === 'verified';
  const aiEnabled = me.preferences?.aiEnabled !== false;

  const counts = await db.one(
    `select
       (select count(*) from connections where recipient_id = $1 and status = 'pending') as pending_requests,
       (select count(*) from messages m join conversations c on c.id = m.conversation_id
         where (c.user_a = $1 or c.user_b = $1) and m.sender_id <> $1 and m.read_at is null and m.status = 'visible') as unread_messages`,
    [me.id],
  );

  const unread = await db.one(
    'select count(*) as unread_count from notifications where user_id = $1 and read_at is null',
    [me.id],
  );
  const profile = await loadProfileRow(me.id);
  const out = {
    user: { id: me.id, firstName: me.firstName, lastName: me.lastName, role: me.role, verificationStatus: me.verificationStatus },
    counts,
    unreadNotifications: unread.unreadCount,
    profile: { programme: profile.programme, graduationYear: profile.graduationYear },
    upcoming: [],
    ai: { enabled: aiEnabled },
  };
  if (!verified) {
    out.message = 'Your account is waiting to be verified. Once an administrator confirms your details you will see mentors and opportunities here.';
    return res.json(out);
  }

  const upcoming = await db.all(
    `select o.id, o.type, o.title, o.description, o.company, o.location, o.industry, o.is_remote, o.apply_url,
            o.event_date, o.deadline, o.tags, o.status, o.created_at, o.posted_by,
            u.first_name as poster_first_name, u.last_name as poster_last_name
       from opportunities o join users u on u.id = o.posted_by
      where o.status = 'active' and u.status = 'active'
        and (o.deadline is null or o.deadline >= now()) and (o.event_date is null or o.event_date >= now())
        and ${NOT_BLOCKED('$1', 'o.posted_by')}
      order by coalesce(o.event_date, o.deadline, o.created_at) asc limit 3`,
    [me.id],
  );
  out.upcoming = upcoming.map(toOpportunity);

  if (aiEnabled) {
    const [mentors, opportunities] = await Promise.all([
      getMentorSuggestions(me, { limit: 3 }),
      getOpportunitySuggestions(me, { limit: 3 }),
    ]);
    out.ai = { enabled: true, mentors, opportunities };
  }
  return res.json(out);
}));
