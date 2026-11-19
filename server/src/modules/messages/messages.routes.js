import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, requireRole, requireVerified } from '../../middleware/auth.js';
import { messageLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { AppError, badRequest, notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { idParam } from '../../utils/schemas.js';
import { isBlocked, isConnected } from '../shared/relations.js';
import { PROFILE_COLS, USER_COLS } from '../shared/sql.js';
import { toPublicProfile } from '../shared/serializers.js';
import { publishNotification } from '../v2/notifications/notifications.service.js';

const sendSchema = z.object({
  recipientId: z.string().uuid(),
  body: z.string().trim().min(1, 'Please write a message first.').max(4000),
});
const listSchema = z.object({
  before: z.string().uuid().optional(), // id of the oldest message already loaded
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const messagesRoutes = Router();
messagesRoutes.use(authenticate, requireRole('student', 'alumni'), requireVerified);

// Messages can only be sent between people who have accepted a connection.
messagesRoutes.post('/messages', messageLimiter, validate({ body: sendSchema }), asyncHandler(async (req, res) => {
  const me = req.user;
  const { recipientId, body } = req.valid.body;
  if (recipientId === me.id) throw badRequest("You can't message yourself.");

  const recipient = await db.one('select id, email, first_name, status from users where id = $1', [recipientId]);
  if (!recipient || recipient.status !== 'active' || (await isBlocked(db, me.id, recipientId))) {
    throw notFound("We couldn't find this person.");
  }
  if (!(await isConnected(db, me.id, recipientId))) {
    throw new AppError(403, 'not_connected', 'You can message someone once they have accepted your connection request.');
  }

  const message = await tx(async (t) => {
    const convo = await t.one(
      `insert into conversations (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
       on conflict (user_a, user_b) do update set user_a = excluded.user_a
       returning id`,
      [me.id, recipientId],
    );
    const row = await t.one(
      'insert into messages (conversation_id, sender_id, body) values ($1, $2, $3) returning id, conversation_id, sender_id, body, created_at',
      [convo.id, me.id, body],
    );
    await t.run('update conversations set last_message_at = now() where id = $1', [convo.id]);
    await publishNotification(t, {
      userId: recipientId,
      type: 'message',
      title: `New message from ${me.firstName}`,
      body: body.slice(0, 180),
      data: { conversationId: convo.id, messageId: row.id },
      dedupeKey: `message:${row.id}`,
      emailMessage: {
        to: recipient.email,
        subject: `New AlumniLink message from ${me.firstName}`,
        text: `${me.firstName} sent you a message: ${body.slice(0, 240)}`,
      },
    });
    return row;
  });
  res.status(201).json({ message });
}));

messagesRoutes.get('/conversations', asyncHandler(async (req, res) => {
  const me = req.user;
  const rows = await db.all(
    `select c.id as conversation_id, c.last_message_at,
            lm.body as last_body, lm.sender_id as last_sender_id, lm.created_at as last_created_at,
            (select count(*) from messages m
              where m.conversation_id = c.id and m.sender_id <> $1 and m.read_at is null and m.status = 'visible') as unread,
            ${USER_COLS}, ${PROFILE_COLS}
       from conversations c
       join users u on u.id = case when c.user_a = $1 then c.user_b else c.user_a end
       join profiles p on p.user_id = u.id
       left join lateral (
         select m.body, m.sender_id, m.created_at from messages m
          where m.conversation_id = c.id and m.status = 'visible' order by m.created_at desc limit 1
       ) lm on true
      where (c.user_a = $1 or c.user_b = $1) and u.status = 'active'
      order by c.last_message_at desc
      limit 100`,
    [me.id],
  );
  res.json({
    data: rows.map((r) => ({
      id: r.conversationId,
      with: toPublicProfile(r, { viewer: me, connected: true }),
      lastMessage: r.lastBody ? { body: r.lastBody, sentByMe: r.lastSenderId === me.id, createdAt: r.lastCreatedAt } : null,
      unread: r.unread,
      updatedAt: r.lastMessageAt,
    })),
  });
}));

async function assertParticipant(conversationId, userId) {
  const c = await db.one('select id from conversations where id = $1 and (user_a = $2 or user_b = $2)', [conversationId, userId]);
  if (!c) throw notFound('We could not find that conversation.');
}

// Newest page first from the server's point of view; returned oldest-to-newest so it can be rendered directly.
messagesRoutes.get('/conversations/:id/messages', validate({ params: idParam, query: listSchema }), asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  const { before, limit } = req.valid.query;
  await assertParticipant(id, req.user.id);
  const rows = await db.all(
    `select m.id, m.sender_id, m.body, m.created_at, m.read_at from messages m
      where m.conversation_id = $1 and m.status = 'visible'
        and ($2::uuid is null or m.created_at < (select created_at from messages where id = $2::uuid))
      order by m.created_at desc limit $3`,
    [id, before ?? null, limit],
  );
  res.json({
    data: rows.reverse().map((m) => ({ ...m, sentByMe: m.senderId === req.user.id })),
    nextBefore: rows.length === limit ? rows[0].id : null,
  });
}));

messagesRoutes.post('/conversations/:id/read', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const { id } = req.valid.params;
  await assertParticipant(id, req.user.id);
  const marked = await db.run(
    'update messages set read_at = now() where conversation_id = $1 and sender_id <> $2 and read_at is null',
    [id, req.user.id],
  );
  res.json({ marked });
}));
