import { Router } from 'express';
import { db } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { idParam } from '../../utils/schemas.js';
import { CONN_LATERAL, NOT_BLOCKED, PROFILE_COLS, USER_COLS } from '../shared/sql.js';
import { connectionState, toPublicProfile } from '../shared/serializers.js';
import { recordProfileView } from '../v2/analytics/analytics.service.js';

export const usersRoutes = Router();
usersRoutes.use(authenticate);

// Another person's profile, filtered by their privacy settings.
usersRoutes.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const me = req.user;
  const row = await db.one(
    `select ${USER_COLS}, ${PROFILE_COLS}, u.status,
            conn.id as connection_id, conn.status as connection_status, conn.requester_id as connection_requester_id
       from users u
       join profiles p on p.user_id = u.id
       ${CONN_LATERAL('$1', 'u.id')}
      where u.id = $2 and u.deactivated_at is null and ${NOT_BLOCKED('$1', 'u.id')}`,
    [me.id, req.valid.params.id],
  );

  const isSelf = row?.id === me.id;
  const isAdmin = me.role === 'admin';
  const connected = row?.connectionStatus === 'accepted';
  const discoverable = row?.privacy?.discoverable !== false;
  const visible = row
    && row.status === 'active'
    && (isSelf || isAdmin || (row.role !== 'admin' && row.verificationStatus === 'verified' && (discoverable || connected)));
  if (!visible) throw notFound("We couldn't find this person.");

  await recordProfileView(row.id, me.id);
  res.json({
    user: { ...toPublicProfile(row, { viewer: me, connected }), connection: isSelf ? null : connectionState(me.id, row) },
  });
}));
