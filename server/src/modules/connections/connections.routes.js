import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, requireRole, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError, badRequest, conflict, notFound } from '../../utils/errors.js';
import { asyncHandler, offsetOf, paginated } from '../../utils/http.js';
import { idParam, pagingShape } from '../../utils/schemas.js';
import { CONN_LATERAL, NOT_BLOCKED, PROFILE_COLS, USER_COLS, VISIBLE_PROFILE } from '../shared/sql.js';
import { activeConnection } from '../shared/relations.js';
import { toPublicProfile } from '../shared/serializers.js';
import { changeConnection } from './connections.service.js';
import { publishNotification } from '../v2/notifications/notifications.service.js';

const createSchema = z.object({
  recipientId: z.string().uuid(),
  kind: z.enum(['connect', 'mentorship']).default('connect'),
  message: z.string().trim().max(1000).optional(),
});
export const connectionListSchema = z.object({
  ...pagingShape,
  status: z.enum(['pending', 'accepted', 'declined', 'cancelled']).default('accepted'),
  direction: z.enum(['incoming', 'outgoing', 'all']).default('all'),
  kind: z.enum(['connect', 'mentorship']).optional(),
});
const actionSchema = z.object({ action: z.enum(['accept', 'decline', 'cancel']) });

export const connectionsRoutes = Router();
connectionsRoutes.use(authenticate, requireRole('student', 'alumni'), requireVerified);

// Send a connection request, or "Request Mentorship" (kind = mentorship).
connectionsRoutes.post('/', validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const me = req.user;
  const { recipientId, kind, message } = req.valid.body;
  if (recipientId === me.id) throw badRequest("You can't send a request to yourself.");

  const target = await db.one(
    `select u.id, u.email, u.first_name, u.role, u.status, u.verification_status, p.willing_to_mentor,
            conn.status as connection_status
       from users u join profiles p on p.user_id = u.id
       ${CONN_LATERAL('$2', 'u.id')}
      where u.id = $1 and ${VISIBLE_PROFILE('u.id', '$2')}`,
    [recipientId, me.id],
  );
  if (!target) throw notFound("We couldn't find this person.");

  if (kind === 'mentorship') {
    // The product contract is alumni mentoring students; keep the actor check here
    // and again at acceptance so a role change cannot create an invalid pair.
    if (target.role !== 'alumni') {
      throw new AppError(409, 'not_alumnus', 'Mentorship is offered by alumni.');
    }
    if (!target.willingToMentor) {
      throw new AppError(409, 'not_mentoring', `${target.firstName} isn't taking mentorship requests right now.`);
    }
  }

  const existing = await activeConnection(db, me.id, recipientId);
  if (existing) {
    if (existing.status === 'accepted') throw conflict('You are already connected.', 'already_connected');
    if (existing.requesterId === me.id) throw conflict('You have already sent this person a request.', 'request_exists');
    throw conflict('This person has already sent you a request. You can accept it from your requests.', 'request_incoming');
  }

  const connection = await tx(async (t) => {
    const row = await t.one(
      `insert into connections (requester_id, recipient_id, kind, message) values ($1, $2, $3, $4)
       returning id, kind, message, status, created_at`,
      [me.id, recipientId, kind, message || null],
    );
    // If this came from an AI suggestion, record that the person accepted it.
    await t.run(
      `update ai_suggestions set status = 'accepted', responded_at = now()
        where user_id = $1 and subject_user_id = $2 and kind = 'mentor_match' and status = 'shown'`,
      [me.id, recipientId],
    );
    await publishNotification(t, {
      userId: recipientId,
      type: 'connection_request',
      title: kind === 'mentorship' ? 'New mentorship request' : 'New connection request',
      body: `${me.firstName} sent you a request.`,
      data: { connectionId: row.id, kind },
      dedupeKey: `connection:${row.id}:requested`,
      emailMessage: {
        to: target.email,
        subject: 'New request on AlumniLink',
        text: `${me.firstName} sent you a ${kind === 'mentorship' ? 'mentorship' : 'connection'} request. Sign in to AlumniLink to respond.`,
      },
    });
    return row;
  });
  res.status(201).json({ connection });
}));

connectionsRoutes.get('/', validate({ query: connectionListSchema }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const me = req.user;
  const dir = q.direction === 'incoming' ? 'and c.recipient_id = $1'
    : q.direction === 'outgoing' ? 'and c.requester_id = $1' : '';

  const rows = await db.all(
    `select c.id as connection_id, c.kind as connection_kind, c.message as connection_message,
            c.status as connection_status, c.requester_id, c.created_at as connection_created_at,
            c.responded_at as connection_responded_at,
            ${USER_COLS}, ${PROFILE_COLS}, count(*) over() as total
       from connections c
       join users u on u.id = case when c.requester_id = $1 then c.recipient_id else c.requester_id end
       join profiles p on p.user_id = u.id
      where (c.requester_id = $1 or c.recipient_id = $1) and c.status = $2 ${dir}
        and ($5::text is null or c.kind = $5) and u.status = 'active'
        and u.deactivated_at is null and ${NOT_BLOCKED('$1', 'u.id')}
      order by c.created_at desc
      limit $3 offset $4`,
    [me.id, q.status, q.limit, offsetOf(q), q.kind || null],
  );

  res.json(paginated(rows, q, (r) => ({
    id: r.connectionId,
    kind: r.connectionKind,
    message: r.connectionMessage,
    status: r.connectionStatus,
    direction: r.requesterId === me.id ? 'outgoing' : 'incoming',
    createdAt: r.connectionCreatedAt,
    respondedAt: r.connectionRespondedAt,
    person: toPublicProfile(r, { viewer: me, connected: r.connectionStatus === 'accepted' }),
  })));
}));

// Accept / decline (the person who received it) or cancel (the person who sent it) a pending request.
connectionsRoutes.patch('/:id', validate({ params: idParam, body: actionSchema }), asyncHandler(async (req, res) => {
  const me = req.user;
  const { action } = req.valid.body;
  const result = await changeConnection({
    connectionId: req.valid.params.id,
    actorId: me.id,
    action,
  });
  res.json({ connection: result.connection });
}));

// Remove an existing connection (either person can).
connectionsRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const n = await db.run(
    `update connections set status = 'cancelled', responded_at = now()
      where id = $1 and status = 'accepted' and (requester_id = $2 or recipient_id = $2)`,
    [req.valid.params.id, req.user.id],
  );
  if (!n) throw notFound('We could not find that connection.');
  res.status(204).end();
}));
