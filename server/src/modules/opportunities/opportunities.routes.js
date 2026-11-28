import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, requireRole, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError, badRequest, forbidden, notFound } from '../../utils/errors.js';
import { asyncHandler, offsetOf, paginated } from '../../utils/http.js';
import { keysetResponse, readCursor } from '../../utils/pagination.js';
import { boolQuery, httpUrl, hybridPagingShape, idParam } from '../../utils/schemas.js';
import { likeEscape, uniqueClean } from '../../utils/text.js';
import { audit } from '../shared/audit.js';
import { CONN_LATERAL, NOT_BLOCKED, VISIBLE_PROFILE } from '../shared/sql.js';
import { toOpportunity } from '../shared/serializers.js';

const TYPES = ['job', 'internship', 'event', 'reunion', 'webinar'];
const EVENT_TYPES = ['event', 'reunion', 'webinar'];

const optText = (max) => z.string().trim().max(max).transform((v) => (v === '' ? null : v)).nullable().optional();
const optDate = z.coerce.date().nullable().optional();

const baseShape = {
  type: z.enum(TYPES),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(1, 'Please describe the opportunity.').max(5000),
  company: optText(120),
  location: optText(120),
  industry: optText(120),
  isRemote: z.boolean().optional(),
  applyUrl: z.union([z.literal('').transform(() => null), httpUrl]).nullable().optional(),
  eventDate: optDate,
  deadline: optDate,
  tags: z.array(z.string().trim().min(1).max(40)).max(15).optional(),
};
const createSchema = z.object(baseShape).strict();
const updateSchema = z.object({ ...baseShape, status: z.enum(['active', 'closed']) }).partial().strict();

const listSchema = z.object({
  ...hybridPagingShape,
  type: z.string().optional().transform((v) => (v ? v.split(',').map((s) => s.trim()).filter((s) => TYPES.includes(s)) : [])),
  q: z.string().trim().min(1).max(100).optional(),
  industry: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(100).optional(),
  remote: boolQuery.optional(),
  includePast: boolQuery.default('false'),
  mine: boolQuery.default('false'),
  sort: z.enum(['newest', 'soonest']).default('newest'),
});

const COLS = `o.id, o.type, o.title, o.description, o.company, o.location, o.industry, o.is_remote, o.apply_url,
  o.event_date, o.deadline, o.tags, o.status, o.created_at, o.posted_by,
  u.first_name as poster_first_name, u.last_name as poster_last_name`;

export const opportunitiesRoutes = Router();
opportunitiesRoutes.use(authenticate, requireVerified);

opportunitiesRoutes.get('/', validate({ query: listSchema }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const me = req.user;
  const params = [me.id];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  const where = [NOT_BLOCKED('$1', 'o.posted_by')];

  if (q.mine) where.push('o.posted_by = $1'); // owners see every status of their own posts
  else where.push("o.status = 'active'", VISIBLE_PROFILE('o.posted_by', '$1'));

  if (!q.includePast && !q.mine) {
    where.push('(o.deadline is null or o.deadline >= now())', "(o.event_date is null or o.event_date >= now() - interval '1 day')");
  }
  if (q.type.length) where.push(`o.type = any(${add(q.type)}::text[])`);
  if (q.q) {
    const p = add(`%${likeEscape(q.q)}%`);
    where.push(`(o.title ilike ${p} or o.company ilike ${p} or o.description ilike ${p}
      or exists (select 1 from unnest(o.tags) t where t ilike ${p}))`);
  }
  if (q.industry) where.push(`o.industry ilike ${add(`%${likeEscape(q.industry)}%`)}`);
  if (q.location) where.push(`(o.location ilike ${add(`%${likeEscape(q.location)}%`)} or o.is_remote)`);
  if (q.remote !== undefined) where.push(`o.is_remote = ${add(q.remote)}`);

  const scope = JSON.stringify({
    type: q.type, q: q.q ?? null, industry: q.industry ?? null, location: q.location ?? null,
    remote: q.remote ?? null, includePast: q.includePast, mine: q.mine, sort: q.sort,
  });
  const keysOf = (row) => {
    const due = row.deadline ?? row.eventDate;
    return q.sort === 'soonest'
      ? [due ? new Date(due).toISOString() : 'infinity', row.createdAt.toISOString(), row.id]
      : [row.createdAt.toISOString(), row.id];
  };
  const cursor = { audience: me.id, scope, keysOf };
  const keys = q.cursor ? readCursor(q.cursor, cursor) : null;
  if (keys) {
    if (q.sort === 'soonest') {
      where.push(`(coalesce(o.deadline, o.event_date, 'infinity'::timestamptz), o.created_at, o.id)
                  > (${add(String(keys[0]))}::timestamptz, ${add(String(keys[1]))}::timestamptz, ${add(String(keys[2]))}::uuid)`);
    } else {
      where.push(`(o.created_at, o.id) < (${add(String(keys[0]))}::timestamptz, ${add(String(keys[1]))}::uuid)`);
    }
  }
  // Keep all keyset tuple columns in one direction so the row comparison is valid.
  const order = q.sort === 'soonest'
    ? "coalesce(o.deadline, o.event_date, 'infinity'::timestamptz) asc, o.created_at asc, o.id asc"
    : 'o.created_at desc, o.id desc';
  const limitP = add(q.limit + (keys ? 1 : 0));
  const offsetP = keys ? null : add(offsetOf(q));

  const rows = await db.all(
    `select ${COLS} ${keys ? '' : ', count(*) over() as total'}
       from opportunities o join users u on u.id = o.posted_by
       ${CONN_LATERAL('$1', 'o.posted_by')}
      where ${where.join(' and ')} order by ${order} limit ${limitP} ${keys ? '' : `offset ${offsetP}`}`,
    params,
  );
  res.json(keys
    ? keysetResponse(rows, q, toOpportunity, cursor)
    : paginated(rows, q, toOpportunity, cursor));
}));

opportunitiesRoutes.get('/:id', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const row = await db.one(
    `select ${COLS} from opportunities o join users u on u.id = o.posted_by
       ${CONN_LATERAL('$2', 'o.posted_by')}
      where o.id = $1
        and (o.posted_by = $2 or ${VISIBLE_PROFILE('o.posted_by', '$2', 'conn', { admin: req.user.role === 'admin' })})`,
    [req.valid.params.id, req.user.id],
  );
  const canSee = row && (row.status === 'active' || row.postedBy === req.user.id || req.user.role === 'admin');
  if (!canSee) throw notFound('We could not find that opportunity.');
  res.json({ opportunity: toOpportunity(row) });
}));

function checkDates(type, data, { creating }) {
  const now = new Date();
  const fields = {};
  if (creating && EVENT_TYPES.includes(type) && !data.eventDate) fields.eventDate = 'Please add the date of the event.';
  if (data.eventDate && creating && data.eventDate < now) fields.eventDate = 'The event date must be in the future.';
  if (data.deadline && creating && data.deadline < now) fields.deadline = 'The deadline must be in the future.';
  if (Object.keys(fields).length) throw new AppError(400, 'validation_failed', 'Please check the dates and try again.', fields);
}

// Verified alumni (and administrators) can share jobs, internships, reunions and events.
opportunitiesRoutes.post('/', requireRole('alumni', 'admin'), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const b = req.valid.body;
  checkDates(b.type, b, { creating: true });
  const row = await db.one(
    `insert into opportunities (posted_by, type, title, description, company, location, industry, is_remote, apply_url, event_date, deadline, tags)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
    [req.user.id, b.type, b.title, b.description, b.company ?? null, b.location ?? null, b.industry ?? null,
      b.isRemote ?? false, b.applyUrl ?? null, b.eventDate ?? null, b.deadline ?? null, uniqueClean(b.tags ?? [], { max: 15 })],
  );
  const created = await db.one(`select ${COLS} from opportunities o join users u on u.id = o.posted_by where o.id = $1`, [row.id]);
  res.status(201).json({ opportunity: toOpportunity(created) });
}));

const UPDATABLE = {
  type: 'type', title: 'title', description: 'description', company: 'company', location: 'location', industry: 'industry',
  isRemote: 'is_remote', applyUrl: 'apply_url', eventDate: 'event_date', deadline: 'deadline', tags: 'tags', status: 'status',
};

async function loadOwned(id, user) {
  const o = await db.one('select id, posted_by, status, type from opportunities where id = $1', [id]);
  if (!o) throw notFound('We could not find that opportunity.');
  if (o.postedBy !== user.id && user.role !== 'admin') throw forbidden('You can only change opportunities you posted.');
  if (['hidden', 'deleted'].includes(o.status) && user.role !== 'admin') {
    throw forbidden('This post is no longer available. Please contact an administrator.');
  }
  return o;
}

opportunitiesRoutes.patch('/:id', requireRole('alumni', 'admin'), validate({ params: idParam, body: updateSchema }), asyncHandler(async (req, res) => {
  const o = await loadOwned(req.valid.params.id, req.user);
  const body = { ...req.valid.body };
  if (body.tags) body.tags = uniqueClean(body.tags, { max: 15 });
  if (body.eventDate || body.deadline) checkDates(body.type ?? o.type, body, { creating: false });

  const sets = [];
  const params = [o.id];
  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (key in body) { params.push(body[key]); sets.push(`${column} = $${params.length}`); }
  }
  if (!sets.length) throw badRequest('Nothing to update.');
  await db.run(`update opportunities set ${sets.join(', ')} where id = $1`, params);
  const row = await db.one(`select ${COLS} from opportunities o join users u on u.id = o.posted_by where o.id = $1`, [o.id]);
  res.json({ opportunity: toOpportunity(row) });
}));

// Author removal hides the post from feeds but keeps it for audit and reports.
opportunitiesRoutes.delete('/:id', requireRole('alumni', 'admin'), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const o = await loadOwned(req.valid.params.id, req.user);
  await tx(async (t) => {
    const removed = await t.one(
      `update opportunities set status = 'deleted'
        where id = $1 and status in ('active', 'closed') returning id`,
      [o.id],
    );
    if (!removed) throw notFound('We could not find that opportunity.');
    await audit(t, req.user.id, 'opportunity.delete', 'opportunity', o.id);
  });
  res.status(204).end();
}));
