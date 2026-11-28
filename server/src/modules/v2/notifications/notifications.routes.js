import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { badRequest, notFound } from '../../../utils/errors.js';
import { asyncHandler, offsetOf, paginated } from '../../../utils/http.js';
import { keysetResponse, readCursor } from '../../../utils/pagination.js';
import { hybridPagingShape, idParam } from '../../../utils/schemas.js';
import { requireV2MemberPrerequisites } from '../middleware.js';
import { NOTIFICATION_TYPES } from './notifications.service.js';

const listSchema = z.object(hybridPagingShape);
const emptySchema = z.object({}).strict();
const typeSet = new Set(NOTIFICATION_TYPES);
const preferenceItem = z.object({
  notificationType: z.string().refine((value) => typeSet.has(value), 'Choose a supported notification type.'),
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
}).strict().refine((value) => value.inAppEnabled !== undefined || value.emailEnabled !== undefined, {
  message: 'Set at least one notification channel.',
});
const preferencesSchema = z.object({
  preferences: z.array(preferenceItem).min(1).max(NOTIFICATION_TYPES.length),
}).strict().superRefine(({ preferences }, ctx) => {
  const types = preferences.map(({ notificationType }) => notificationType);
  if (new Set(types).size !== types.length) {
    ctx.addIssue({ code: 'custom', path: ['preferences'], message: 'Each notification type can be updated once.' });
  }
});

export const notificationRoutes = Router();
notificationRoutes.use(authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites);

notificationRoutes.get('/', validate({ query: listSchema }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const cursor = {
    audience: req.user.id,
    scope: 'notifications:v1',
    keysOf: (row) => [row.createdAt.toISOString(), row.id],
  };
  const keys = q.cursor ? readCursor(q.cursor, cursor) : null;
  const params = [req.user.id, q.limit + (keys ? 1 : 0)];
  let predicate = '';
  if (keys) {
    params.push(keys[0], keys[1]);
    predicate = `and (created_at, id) < ($3::timestamptz, $4::uuid)`;
  } else {
    params.push(offsetOf(q));
  }
  const rows = await db.all(
    `select id, notification_type, title, body, data, created_at, read_at
            ${keys ? '' : ', count(*) over() as total'}
     from notifications where user_id = $1 ${predicate}
     order by created_at desc, id desc limit $2 ${keys ? '' : 'offset $3'}`,
    params,
  );
  const mapRow = (row) => ({
    id: row.id,
    notificationType: row.notificationType,
    title: row.title,
    body: row.body,
    data: row.data,
    createdAt: row.createdAt,
    readAt: row.readAt,
  });
  res.json(keys
    ? keysetResponse(rows, q, mapRow, cursor)
    : paginated(rows, q, mapRow, cursor));
}));

notificationRoutes.get('/unread-count', asyncHandler(async (req, res) => {
  const row = await db.one(
    'select count(*) as unread_count from notifications where user_id = $1 and read_at is null',
    [req.user.id],
  );
  res.json({ data: { unreadCount: row.unreadCount } });
}));

notificationRoutes.post('/read-all', validate({ body: emptySchema }), asyncHandler(async (req, res) => {
  const updatedCount = await db.run(
    'update notifications set read_at = now() where user_id = $1 and read_at is null',
    [req.user.id],
  );
  res.json({ data: { updatedCount } });
}));

notificationRoutes.post('/:id/read', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const notification = await db.one(
    `update notifications set read_at = coalesce(read_at, now())
     where id = $1 and user_id = $2
     returning id, notification_type, title, body, data, created_at, read_at`,
    [req.valid.params.id, req.user.id],
  );
  if (!notification) throw notFound('We could not find that notification.');
  res.json({ data: notification });
}));

export const notificationPreferenceRoutes = Router();
notificationPreferenceRoutes.use(authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites);

notificationPreferenceRoutes.get('/notification-preferences', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `select notification_type, in_app_enabled, email_enabled
     from notification_preferences where user_id = $1`,
    [req.user.id],
  );
  const byType = new Map(rows.map((row) => [row.notificationType, row]));
  res.json({
    data: NOTIFICATION_TYPES.map((notificationType) => {
      const saved = byType.get(notificationType);
      return {
        notificationType,
        inAppEnabled: saved?.inAppEnabled ?? true,
        emailEnabled: saved?.emailEnabled ?? true,
      };
    }),
  });
}));

notificationPreferenceRoutes.patch('/notification-preferences', validate({ body: preferencesSchema }), asyncHandler(async (req, res) => {
  const { preferences } = req.valid.body;
  await tx(async (t) => {
    for (const preference of preferences) {
      await t.run(
        `insert into notification_preferences
          (user_id, notification_type, in_app_enabled, email_enabled)
         values ($1, $2, coalesce($3, true), coalesce($4, true))
         on conflict (user_id, notification_type) do update
         set in_app_enabled = coalesce($3, notification_preferences.in_app_enabled),
             email_enabled = coalesce($4, notification_preferences.email_enabled),
             updated_at = now()`,
        [req.user.id, preference.notificationType, preference.inAppEnabled ?? null, preference.emailEnabled ?? null],
      );
    }
  });
  const rows = await db.all(
    `select notification_type, in_app_enabled, email_enabled
     from notification_preferences where user_id = $1
     order by notification_type`,
    [req.user.id],
  );
  const byType = new Map(rows.map((row) => [row.notificationType, row]));
  res.json({
    data: NOTIFICATION_TYPES.map((notificationType) => {
      const saved = byType.get(notificationType);
      return {
        notificationType,
        inAppEnabled: saved?.inAppEnabled ?? true,
        emailEnabled: saved?.emailEnabled ?? true,
      };
    }),
  });
}));

