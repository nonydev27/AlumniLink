import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../utils/http.js';
import { idParam, pagingShape } from '../../../utils/schemas.js';
import { requireV2MemberPrerequisites } from '../middleware.js';
import { listMentorships, updateMentorship } from './mentorships.service.js';

const listSchema = z.object({
  ...pagingShape,
  role: z.enum(['mentor', 'mentee']).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
});
const updateSchema = z.object({ status: z.enum(['active', 'paused', 'completed']) }).strict();
const menteeStatusSchema = z.object({ seekingMentorship: z.boolean() }).strict();

export const mentorshipRoutes = Router();
mentorshipRoutes.use(authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites);

mentorshipRoutes.get('/', validate({ query: listSchema }), asyncHandler(async (req, res) => {
  res.json(await listMentorships(req.user.id, req.valid.query));
}));

mentorshipRoutes.patch('/:id', validate({ params: idParam, body: updateSchema }), asyncHandler(async (req, res) => {
  const mentorship = await updateMentorship(req.valid.params.id, req.user.id, req.valid.body.status);
  res.json({ data: mentorship });
}));

export const menteeStatusRoutes = Router();
menteeStatusRoutes.patch('/mentee-status', authenticate, requireRole('student'), ...requireV2MemberPrerequisites,
  validate({ body: menteeStatusSchema }), asyncHandler(async (req, res) => {
    const profile = await db.one(
      `update profiles set seeking_mentorship = $2
       where user_id = $1 returning seeking_mentorship, updated_at`,
      [req.user.id, req.valid.body.seekingMentorship],
    );
    res.json({ data: { seekingMentorship: profile.seekingMentorship, updatedAt: profile.updatedAt } });
  }));

