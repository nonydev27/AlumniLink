/** Lets route handlers be async without try/catch (works on Express 4 and 5). */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const offsetOf = ({ page, limit }) => (page - 1) * limit;

import { signCursor } from './pagination.js';

/**
 * Standard paginated response from rows that carry a `total` column (count(*) over()).
 * Callers that pass a cursor description also get a signed `nextCursor` so a
 * client can move from offset paging to keyset paging without losing its place.
 */
export function paginated(rows, q, mapRow, cursor = null) {
  const total = rows[0]?.total ?? 0;
  const meta = pageMeta(q.page, q.limit, total);
  if (cursor) {
    const last = rows.at(-1);
    const hasMore = total > q.page * q.limit;
    meta.mode = 'offset';
    meta.hasMore = hasMore;
    meta.nextCursor = hasMore && last
      ? signCursor({ audience: cursor.audience, scope: cursor.scope, keys: cursor.keysOf(last) })
      : null;
  }
  return { data: rows.map(mapRow), meta };
}
