import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { userIdParam } from '../../utils/schemas.js';
import { PAIR_MATCH } from '../shared/sql.js';

export const blocksRoutes = Router();
blocksRoutes.use(authenticate);

blocksRoutes.get('/', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `select u.id, u.first_name, u.last_name, b.created_at
       from blocks b join users u on u.id = b.blocked_id where b.blocker_id = $1 order by b.created_at desc`,
    [req.user.id],
  );
  res.json({ data: rows });
}));

// Blocking is destructive: it ends any connection and hides both people from each other everywhere.
blocksRoutes.post('/', validate({ body: z.object({ userId: z.string().uuid() }) }), asyncHandler(async (req, res) => {
  const { userId } = req.valid.body;
  if (userId === req.user.id) throw badRequest("You can't block yourself.");
  if (!(await db.one('select 1 as ok from users where id = $1', [userId]))) throw notFound("We couldn't find this person.");
  await tx(async (t) => {
    await t.run('insert into blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing', [req.user.id, userId]);
    await t.run(
      `update connections c set status = 'cancelled', responded_at = now()
        where ${PAIR_MATCH('$1', '$2')} and c.status in ('pending', 'accepted')`,
      [req.user.id, userId],
    );
  });
  res.status(204).end();
}));

blocksRoutes.delete('/:userId', validate({ params: userIdParam }), asyncHandler(async (req, res) => {
  await db.run('delete from blocks where blocker_id = $1 and blocked_id = $2', [req.user.id, req.valid.params.userId]);
  res.status(204).end();
}));
