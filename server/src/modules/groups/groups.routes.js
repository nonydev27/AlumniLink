import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, requireRole, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError, notFound } from '../../utils/errors.js';
import { asyncHandler, offsetOf, paginated } from '../../utils/http.js';
import { idParam, pagingQuery } from '../../utils/schemas.js';
import { loadProfileRow } from '../me/me.service.js';
import { audit } from '../shared/audit.js';
import { NOT_BLOCKED } from '../shared/sql.js';

const postSchema = z.object({ body: z.string().trim().min(1, 'Please write something first.').max(2000) });

const GROUP_COLS = `g.id, g.name, g.programme, g.graduation_year,
  (select count(*) from group_members gm where gm.group_id = g.id) as member_count`;

/** Batch groups are identity-scoped: a user may only join their own programme and year. */
export function assertCanJoinBatchGroup(profile, group) {
  const sameProgramme = String(profile?.programme || '').toLowerCase() === String(group?.programme || '').toLowerCase();
  const sameYear = Number(profile?.graduationYear) === Number(group?.graduationYear);
  if (!profile?.programme || !profile?.graduationYear || !sameProgramme || !sameYear) {
    throw new AppError(403, 'batch_group_mismatch', 'You can only join the batch group for your own programme and graduation year.');
  }
}

export const groupsRoutes = Router();
groupsRoutes.use(authenticate, requireRole('student', 'alumni'), requireVerified);

// My batch groups, plus groups for the same programme or year that I could join.
groupsRoutes.get('/', asyncHandler(async (req, res) => {
  const me = await loadProfileRow(req.user.id);
  const mine = await db.all(
    `select ${GROUP_COLS} from groups g join group_members m on m.group_id = g.id and m.user_id = $1
      order by g.graduation_year desc, g.name`,
    [req.user.id],
  );
  const discover = await db.all(
    `select ${GROUP_COLS} from groups g
      where not exists (select 1 from group_members m where m.group_id = g.id and m.user_id = $1)
        and lower(g.programme) = lower($2) and g.graduation_year = $3
      order by g.graduation_year desc limit 20`,
    [req.user.id, me.programme ?? '', me.graduationYear ?? 0],
  );
  res.json({ mine, discover });
}));

async function loadGroup(groupId, userId) {
  const g = await db.one(
    `select ${GROUP_COLS}, exists (select 1 from group_members m where m.group_id = g.id and m.user_id = $2) as is_member
       from groups g where g.id = $1`,
    [groupId, userId],
  );
  if (!g) throw notFound('We could not find that group.');
  return g;
}

groupsRoutes.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json({ group: await loadGroup(req.valid.params.id, req.user.id) });
}));

groupsRoutes.post('/:id/join', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const g = await loadGroup(req.valid.params.id, req.user.id);
  assertCanJoinBatchGroup(await loadProfileRow(req.user.id), g);
  await db.run('insert into group_members (group_id, user_id) values ($1, $2) on conflict do nothing', [g.id, req.user.id]);
  res.json({ group: { ...g, isMember: true } });
}));

groupsRoutes.delete('/:id/join', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await db.run('delete from group_members where group_id = $1 and user_id = $2', [req.valid.params.id, req.user.id]);
  res.status(204).end();
}));

async function requireMember(groupId, userId) {
  const g = await loadGroup(groupId, userId);
  if (!g.isMember) throw new AppError(403, 'not_a_member', 'Join this group to see and write posts.');
  return g;
}

groupsRoutes.get('/:id/posts', validate({ params: idParam, query: pagingQuery }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  await requireMember(req.valid.params.id, req.user.id);
  const rows = await db.all(
    `select gp.id, gp.body, gp.created_at, u.id as author_id, u.first_name, u.last_name, u.role,
            p.avatar_url, p.avatar_alt, count(*) over() as total
       from group_posts gp join users u on u.id = gp.author_id join profiles p on p.user_id = u.id
      where gp.group_id = $1 and gp.status = 'visible' and u.status = 'active'
        and u.deactivated_at is null
        and ${NOT_BLOCKED('$4', 'u.id')}
      order by gp.created_at desc limit $2 offset $3`,
    [req.valid.params.id, q.limit, offsetOf(q), req.user.id],
  );
  res.json(paginated(rows, q, (r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    author: {
      id: r.authorId, firstName: r.firstName, lastName: r.lastName, role: r.role,
      avatarUrl: r.avatarUrl ?? null,
      avatarAlt: r.avatarUrl ? (r.avatarAlt || `Profile photo of ${r.firstName} ${r.lastName}`) : null,
    },
  })));
}));

groupsRoutes.post('/:id/posts', validate({ params: idParam, body: postSchema }), asyncHandler(async (req, res) => {
  await requireMember(req.valid.params.id, req.user.id);
  const post = await db.one(
    'insert into group_posts (group_id, author_id, body) values ($1, $2, $3) returning id, body, created_at',
    [req.valid.params.id, req.user.id, req.valid.body.body],
  );
  res.status(201).json({ post });
}));

// Authors can remove their own posts; keep the row for audit and report continuity.
groupsRoutes.delete('/:id/posts/:postId', validate({ params: z.object({ id: idParam.shape.id, postId: idParam.shape.id }) }), asyncHandler(async (req, res) => {
  const { id: groupId, postId } = req.valid.params;
  await requireMember(groupId, req.user.id);
  await tx(async (t) => {
    const post = await t.one(
      `update group_posts set status = 'deleted'
        where id = $1 and group_id = $2 and author_id = $3 and status = 'visible'
        returning id`,
      [postId, groupId, req.user.id],
    );
    if (!post) throw notFound('We could not find that post.');
    await audit(t, req.user.id, 'group_post.delete', 'group_post', postId, { groupId });
  });
  res.status(204).end();
}));
