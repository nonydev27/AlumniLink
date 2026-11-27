/** Lets route handlers be async without try/catch (works on Express 4 and 5). */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pageMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const offsetOf = ({ page, limit }) => (page - 1) * limit;

/** Standard paginated response from rows that carry a `total` column (count(*) over()). */
export function paginated(rows, q, mapRow) {
  const total = rows[0]?.total ?? 0;
  return { data: rows.map(mapRow), meta: pageMeta(q.page, q.limit, total) };
}
