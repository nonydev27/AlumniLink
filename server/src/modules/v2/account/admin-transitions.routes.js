import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { badRequest, notFound } from '../../../utils/errors.js';
import { asyncHandler, paginated } from '../../../utils/http.js';
import { idParam, pagingShape } from '../../../utils/schemas.js';
import { audit } from '../../shared/audit.js';
import { publishNotification } from '../notifications/notifications.service.js';

export const adminTransitionRoutes = Router();
adminTransitionRoutes.use(authenticate, requireRole('admin'));

const listQuery = z.object({ ...pagingShape, status: z.enum(['pending', 'approved', 'rejected']).default('pending') });

adminTransitionRoutes.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const rows = await db.all(
    `select r.*, u.email, u.first_name, u.last_name, count(*) over() as total
     from alumni_transition_requests r join users u on u.id = r.user_id
     where r.status = $1 order by r.created_at asc limit $2 offset $3`,
    [q.status, q.limit, (q.page - 1) * q.limit],
  );
  res.json(paginated(rows, q, ({ total, ...row }) => row));
}));

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
}).strict().refine((value) => value.decision === 'approve' || value.note, {
  path: ['note'], message: 'Give a short reason so the student knows what to fix.',
});

adminTransitionRoutes.patch('/:id', validate({ params: idParam, body: decisionSchema }), asyncHandler(async (req, res) => {
  const { decision, note } = req.valid.body;
  const approved = decision === 'approve';
  const row = await tx(async (t) => {
    const request = await t.one(
      'select * from alumni_transition_requests where id = $1 and status = $2 for update',
      [req.valid.params.id, 'pending'],
    );
    if (!request) throw notFound('We could not find that transition request.');
    const updated = await t.one(
      `update alumni_transition_requests
       set status = $2, note = $3, decided_at = now(), decided_by = $4
       where id = $1 returning *`,
      [request.id, approved ? 'approved' : 'rejected', note || null, req.user.id],
    );
    if (approved) {
      await t.run(
        `update users set role = 'alumni', verification_status = 'pending', verified_at = null
         where id = $1 and role = 'student'`,
        [request.userId],
      );
      await t.run(
        `update profiles set programme = $2, graduation_year = $3, batch = $4::text
         where user_id = $1`,
        [request.userId, request.programme, request.graduationYear, String(request.graduationYear)],
      );
    }
    await audit(t, req.user.id, `alumni_transition_${decision}`, 'user', request.userId, { note: note || null });
    await publishNotification(t, {
      userId: request.userId,
      type: 'alumni_verification',
      title: approved ? 'Your alumni transition was approved' : 'Your alumni transition needs attention',
      body: approved
        ? 'Your account is now an alumni account. An administrator will confirm your details next.'
        : `Your request was not approved. ${note || 'Please check your details and try again.'}`,
      data: { requestId: request.id, decision, note: note || null },
      dedupeKey: `alumni-transition:${request.id}:${decision}`,
    });
    return updated;
  });
  if (!row) throw badRequest('That account is no longer a student account.');
  res.json({ data: row });
}));
