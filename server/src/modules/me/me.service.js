import { db } from '../../db.js';
import { PROFILE_COLS, SELF_COLS, USER_COLS } from '../shared/sql.js';
import { toSelf } from '../shared/serializers.js';

/** Raw user + profile row (camelCased). Used by the suggestion engine and serializers. */
export const loadProfileRow = (userId, d = db) =>
  d.one(
    `select ${USER_COLS}, ${PROFILE_COLS} from users u join profiles p on p.user_id = u.id where u.id = $1`,
    [userId],
  );

export async function loadSelf(userId, d = db) {
  const row = await d.one(
    `select ${USER_COLS}, ${SELF_COLS}, ${PROFILE_COLS} from users u join profiles p on p.user_id = u.id where u.id = $1`,
    [userId],
  );
  return row ? toSelf(row) : null;
}
