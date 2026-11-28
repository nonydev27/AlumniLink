import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { asyncHandler, offsetOf, paginated } from '../../utils/http.js';
import { idParam, pagingShape } from '../../utils/schemas.js';
import { likeEscape } from '../../utils/text.js';
import { audit } from '../shared/audit.js';
import { PROFILE_COLS, USER_COLS } from '../shared/sql.js';
import { toPublicProfile } from '../shared/serializers.js';
import { publishNotification } from '../v2/notifications/notifications.service.js';

export const adminRoutes = Router();
adminRoutes.use(authenticate, requireRole('admin'));

// ---------------------------------------------------------------- alumni verification
adminRoutes.get('/verifications', validate({
  query: z.object({ ...pagingShape, status: z.enum(['pending', 'verified', 'rejected']).default('pending') }),
}), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const rows = await db.all(
    `select ${USER_COLS}, ${PROFILE_COLS}, u.created_at, u.verification_note, count(*) over() as total
       from users u join profiles p on p.user_id = u.id
      where u.role = 'alumni' and u.verification_status = $1
      order by u.created_at asc limit $2 offset $3`,
    [q.status, q.limit, offsetOf(q)],
  );
  res.json(paginated(rows, q, (r) => ({ ...toPublicProfile(r, { viewer: req.user }), createdAt: r.createdAt, note: r.verificationNote })));
}));

adminRoutes.patch('/verifications/:id', validate({
  params: idParam,
  body: z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(500).optional() })
    .refine((v) => v.decision === 'approve' || v.note, { path: ['note'], message: 'Please give a short reason so the person knows what to fix.' }),
}), asyncHandler(async (req, res) => {
  const { decision, note } = req.valid.body;
  const status = decision === 'approve' ? 'verified' : 'rejected';
  const row = await tx(async (t) => {
    const r = await t.one(
      `update users set verification_status = $2, verification_note = $3,
              verified_at = case when $2 = 'verified' then now() else null end, verified_by = $4
        where id = $1 and role = 'alumni' returning id, email, first_name, verification_status`,
      [req.valid.params.id, status, note || null, req.user.id],
    );
    if (r) {
      await audit(t, req.user.id, `alumni_${decision}`, 'user', r.id, { note: note || null });
      const approved = decision === 'approve';
      await publishNotification(t, {
        userId: r.id,
        type: 'alumni_verification',
        title: approved ? 'Your alumni account is verified' : 'Your alumni verification needs attention',
        body: approved
          ? 'Your programme and graduation details have been confirmed. You can now use the full network.'
          : `Your verification was not approved. ${note || 'Please check your details and try again.'}`,
        data: { decision, note: note || null },
        dedupeKey: `verification:${r.id}:${req.user.id}:${status}:${r.verificationStatus}`,
        emailMessage: {
          to: r.email,
          subject: approved ? 'Your AlumniLink account is verified' : 'Update your AlumniLink verification details',
          text: approved
            ? 'Your alumni account has been verified. Welcome to the full AlumniLink network.'
            : `Your alumni verification was not approved. ${note || 'Please check your details and try again.'}`,
        },
      });
    }
    return r;
  });
  if (!row) throw notFound('We could not find that alumni account.');
  res.json({ user: row });
}));

// ---------------------------------------------------------------- users
adminRoutes.get('/users', validate({
  query: z.object({
    ...pagingShape,
    role: z.enum(['student', 'alumni', 'admin']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
    q: z.string().trim().min(1).max(100).optional(),
  }),
}), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  const where = ['true'];
  if (q.role) where.push(`u.role = ${add(q.role)}`);
  if (q.status) where.push(`u.status = ${add(q.status)}`);
  if (q.q) {
    const p = add(`%${likeEscape(q.q)}%`);
    where.push(`(u.email ilike ${p} or u.first_name ilike ${p} or u.last_name ilike ${p})`);
  }
  const rows = await db.all(
    `select u.id, u.email, u.role, u.first_name, u.last_name, u.status, u.verification_status, u.created_at, u.last_login_at,
            count(*) over() as total
       from users u where ${where.join(' and ')} order by u.created_at desc
      limit ${add(q.limit)} offset ${add(offsetOf(q))}`,
    params,
  );
  res.json(paginated(rows, q, ({ total, ...r }) => r));
}));

adminRoutes.patch('/users/:id/status', validate({
  params: idParam,
  body: z.object({ status: z.enum(['active', 'suspended']), note: z.string().trim().max(500).optional() }),
}), asyncHandler(async (req, res) => {
  const { status, note } = req.valid.body;
  if (req.valid.params.id === req.user.id) throw badRequest("You can't change your own status.");
  const row = await tx(async (t) => {
    const r = await t.one(
      "update users set status = $2 where id = $1 and role <> 'admin' returning id, status",
      [req.valid.params.id, status],
    );
    if (!r) return null;
    if (status === 'suspended') {
      await t.run('update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null', [r.id]);
    }
    await audit(t, req.user.id, `user_${status}`, 'user', r.id, { note: note || null });
    return r;
  });
  if (!row) throw notFound('We could not find that account (administrators cannot be suspended here).');
  res.json({ user: row });
}));

// ---------------------------------------------------------------- reports / content moderation
adminRoutes.get('/reports', validate({
  query: z.object({
    ...pagingShape,
    status: z.enum(['open', 'actioned', 'dismissed']).default('open'),
    targetType: z.enum(['user', 'message', 'opportunity', 'group_post', 'ai_suggestion']).optional(),
  }),
}), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const rows = await db.all(
    `select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, r.resolution_note,
            r.content_snapshot, r.target_author_id, r.resolved_by, r.resolved_at,
            ru.id as reporter_id, ru.first_name as reporter_first_name, ru.last_name as reporter_last_name,
            au.first_name as author_first_name, au.last_name as author_last_name,
            count(*) over() as total
       from reports r
       left join users ru on ru.id = r.reporter_id
       left join users au on au.id = r.target_author_id
      where r.status = $1 and ($2::text is null or r.target_type = $2)
      order by r.created_at asc limit $3 offset $4`,
    [q.status, q.targetType || null, q.limit, offsetOf(q)],
  );
  res.json(paginated(rows, q, (r) => ({
    id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details, status: r.status,
    createdAt: r.createdAt, resolutionNote: r.resolutionNote, contentSnapshot: r.contentSnapshot || {},
    resolvedBy: r.resolvedBy, resolvedAt: r.resolvedAt,
    author: r.targetAuthorId ? {
      id: r.targetAuthorId, firstName: r.authorFirstName, lastName: r.authorLastName,
    } : null,
    reporter: r.reporterId ? { id: r.reporterId, firstName: r.reporterFirstName, lastName: r.reporterLastName } : null,
  })));
}));

const AUTHOR_OF = {
  user: 'select id as uid from users where id = $1',
  message: 'select sender_id as uid from messages where id = $1',
  opportunity: 'select posted_by as uid from opportunities where id = $1',
  group_post: 'select author_id as uid from group_posts where id = $1',
};
const HIDE = {
  message: "update messages set status = 'hidden' where id = $1",
  opportunity: "update opportunities set status = 'hidden' where id = $1",
  group_post: "update group_posts set status = 'hidden' where id = $1",
  // Hiding an AI suggestion means it is no longer served to its owner.
  ai_suggestion: "update ai_suggestions set status = 'dismissed' where id = $1 and status = 'shown'",
};

adminRoutes.patch('/reports/:id', validate({
  params: idParam,
  body: z.object({
    action: z.enum(['dismiss', 'action']),
    hideContent: z.boolean().default(false),
    suspendUser: z.boolean().default(false),
    note: z.string().trim().max(500).optional(),
  }),
}), asyncHandler(async (req, res) => {
  const { action, hideContent, suspendUser, note } = req.valid.body;
  const result = await tx(async (t) => {
    const report = await t.one(
      'select id, target_type, target_id, status, content_snapshot from reports where id = $1 for update',
      [req.valid.params.id],
    );
    if (!report) throw notFound('We could not find that report.');
    if (report.status !== 'open') throw conflict('This report has already been handled.', 'already_handled');

    if (action === 'action') {
      if (hideContent) {
        if (!HIDE[report.targetType]) throw badRequest('This kind of report has no content to hide.');
        await t.run(HIDE[report.targetType], [report.targetId]);
      }
      if (suspendUser) {
        if (!AUTHOR_OF[report.targetType]) throw badRequest("This kind of report can't lead to suspending someone.");
        const author = await t.one(AUTHOR_OF[report.targetType], [report.targetId]);
        if (author) {
          const suspended = await t.one(
            "update users set status = 'suspended' where id = $1 and role <> 'admin' returning id",
            [author.uid],
          );
          if (suspended) {
            await t.run('update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null', [suspended.id]);
            await audit(t, req.user.id, 'user_suspended', 'user', suspended.id, { reportId: report.id });
          }
        }
      }
    }
    const updated = await t.one(
      `update reports set status = $2, resolved_by = $3, resolved_at = now(), resolution_note = $4
        where id = $1 returning id, status, resolved_at`,
      [report.id, action === 'dismiss' ? 'dismissed' : 'actioned', req.user.id, note || null],
    );
    await audit(t, req.user.id, `report_${action}`, 'report', report.id, {
      hideContent, suspendUser, targetType: report.targetType, targetId: report.targetId,
      snapshotKeys: Object.keys(report.contentSnapshot || {}),
    });
    return updated;
  });
  res.json({ report: result });
}));

// ---------------------------------------------------------------- audit trail
adminRoutes.get('/audit', validate({
  query: z.object({
    ...pagingShape,
    actorId: z.string().uuid().optional(),
    action: z.string().trim().min(1).max(80).optional(),
    entity: z.string().trim().min(1).max(60).optional(),
    entityId: z.string().uuid().optional(),
  }),
}), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  const where = ['true'];
  if (q.actorId) where.push(`a.actor_id = ${add(q.actorId)}`);
  if (q.action) where.push(`a.action = ${add(q.action)}`);
  if (q.entity) where.push(`a.entity = ${add(q.entity)}`);
  if (q.entityId) where.push(`a.entity_id = ${add(q.entityId)}`);
  const rows = await db.all(
    `select a.id, a.actor_id, a.action, a.entity, a.entity_id, a.meta, a.created_at,
            u.first_name as actor_first_name, u.last_name as actor_last_name,
            count(*) over() as total
       from audit_log a left join users u on u.id = a.actor_id
      where ${where.join(' and ')}
      order by a.created_at desc, a.id desc
      limit ${add(q.limit)} offset ${add(offsetOf(q))}`,
    params,
  );
  res.json(paginated(rows, q, (r) => ({
    id: r.id, actorId: r.actorId, action: r.action, entity: r.entity, entityId: r.entityId,
    meta: r.meta || {}, createdAt: r.createdAt,
    actor: r.actorId ? { id: r.actorId, firstName: r.actorFirstName, lastName: r.actorLastName } : null,
  })));
}));

// ---------------------------------------------------------------- overview
adminRoutes.get('/stats', asyncHandler(async (req, res) => {
  const stats = await db.one(
    `select
       (select count(*) from users where role = 'student') as students,
       (select count(*) from users where role = 'alumni' and verification_status = 'verified') as verified_alumni,
       (select count(*) from users where role = 'alumni' and verification_status = 'pending') as pending_alumni,
       (select count(*) from users where status = 'suspended') as suspended_users,
       (select count(*) from reports where status = 'open') as open_reports,
       (select count(*) from opportunities where status = 'active') as active_opportunities,
       (select count(*) from connections where status = 'accepted') as connections,
       (select count(*) from messages where created_at > now() - interval '7 days') as messages_last_7_days,
       (select count(*) from ai_suggestions where helpful is true) as helpful_ai_ratings,
       (select count(*) from ai_suggestions where helpful is false) as unhelpful_ai_ratings`,
  );
  res.json({ stats });
}));
