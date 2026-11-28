import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { buildReportSnapshot } from '../shared/reportSnapshot.js';

const schema = z.object({
  targetType: z.enum(['user', 'message', 'opportunity', 'group_post', 'ai_suggestion']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'fake_profile', 'unsafe', 'bad_match', 'other']),
  details: z.string().trim().max(2000).optional(),
});

// Reporters may only report things they can legitimately see (stops probing for hidden IDs).
const VISIBLE_TO_REPORTER = {
  user: "select 1 as ok from users where id = $1 and status = 'active' and role <> 'admin'",
  message: `select 1 as ok from messages m join conversations c on c.id = m.conversation_id
             where m.id = $1 and (c.user_a = $2 or c.user_b = $2)`,
  opportunity: "select 1 as ok from opportunities where id = $1 and status in ('active', 'closed')",
  group_post: `select 1 as ok from group_posts gp join group_members gm on gm.group_id = gp.group_id and gm.user_id = $2
                where gp.id = $1`,
  ai_suggestion: `select 1 as ok from ai_suggestions s where s.id = $1 and s.user_id = $2`,
};

export const reportsRoutes = Router();
reportsRoutes.use(authenticate, requireRole('student', 'alumni'));

reportsRoutes.post('/', validate({ body: schema }), asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.valid.body;
  const singleParam = ['user', 'opportunity'].includes(targetType);
  const params = singleParam ? [targetId] : [targetId, req.user.id];
  if (!(await db.one(VISIBLE_TO_REPORTER[targetType], params))) throw notFound('We could not find what you are trying to report.');
  if (targetType === 'user' && targetId === req.user.id) throw badRequest("You can't report yourself.");

  const dup = await db.one(
    "select 1 as ok from reports where reporter_id = $1 and target_type = $2 and target_id = $3 and status = 'open'",
    [req.user.id, targetType, targetId],
  );
  if (dup) throw conflict('You have already reported this. An administrator will look at it soon.', 'already_reported');

  const { snapshot, authorId } = await buildReportSnapshot(db, targetType, targetId);
  const report = await db.one(
    `insert into reports (reporter_id, target_type, target_id, reason, details, content_snapshot, target_author_id)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7)
     returning id, status, created_at`,
    [req.user.id, targetType, targetId, reason, details || null, JSON.stringify(snapshot), authorId],
  );
  res.status(201).json({ report, message: 'Thank you. An administrator will review your report.' });
}));
