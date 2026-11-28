import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { authenticate, requireVerified } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler, offsetOf, paginated } from '../../utils/http.js';
import { boolQuery, pagingShape } from '../../utils/schemas.js';
import { likeEscape } from '../../utils/text.js';
import { CONN_LATERAL, PROFILE_COLS, USER_COLS, VISIBLE_PROFILE } from '../shared/sql.js';
import { connectionState, toPublicProfile } from '../shared/serializers.js';
import { recordSearchAppearances } from '../v2/analytics/analytics.service.js';

const optStr = z.string().trim().min(1).max(100).optional();

const searchSchema = z.object({
  ...pagingShape,
  role: z.enum(['alumni', 'student', 'all']).default('alumni'),
  q: optStr,
  programme: optStr,
  industry: optStr,
  company: optStr,
  location: optStr,
  skill: optStr,
  interest: optStr,
  batch: z.coerce.number().int().min(1950).max(2100).optional(),
  mentoring: boolQuery.optional(),
  sort: z.enum(['name', 'batch']).default('name'),
});

export const directoryRoutes = Router();
directoryRoutes.use(authenticate, requireVerified);

// Smart directory: browse and filter by batch, programme, industry, company, location, skills.
directoryRoutes.get('/', validate({ query: searchSchema }), asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const me = req.user;

  const roles = q.role === 'all' ? ['student', 'alumni'] : [q.role];
  const params = [me.id, roles];
  const add = (v) => { params.push(v); return `$${params.length}`; };
  const where = [
    'u.id <> $1',
    VISIBLE_PROFILE('u.id', '$1'),
    'u.role = any($2::text[])',
  ];
  const showsEmployer = "coalesce((u.privacy->>'showEmployer')::boolean, true)";
  const showsLocation = "coalesce((u.privacy->>'showLocation')::boolean, true)";

  if (q.q) {
    const p = add(`%${likeEscape(q.q)}%`);
    // Employer is only searchable when the person chose to show it.
    where.push(`(u.first_name ilike ${p} or u.last_name ilike ${p} or (u.first_name || ' ' || u.last_name) ilike ${p}
      or p.headline ilike ${p} or p.job_title ilike ${p} or p.industry ilike ${p}
      or (p.current_company ilike ${p} and ${showsEmployer})
      or exists (select 1 from unnest(p.skills) s where s ilike ${p}))`);
  }
  if (q.programme) where.push(`lower(p.programme) = lower(${add(q.programme)})`);
  if (q.industry) where.push(`p.industry ilike ${add(`%${likeEscape(q.industry)}%`)}`);
  if (q.company) where.push(`(p.current_company ilike ${add(`%${likeEscape(q.company)}%`)} and ${showsEmployer})`);
  if (q.location) where.push(`(p.location ilike ${add(`%${likeEscape(q.location)}%`)} and ${showsLocation})`);
  if (q.skill) where.push(`exists (select 1 from unnest(p.skills) s where lower(s) = lower(${add(q.skill)}))`);
  if (q.interest) where.push(`exists (select 1 from unnest(p.interests) s where lower(s) = lower(${add(q.interest)}))`);
  if (q.batch) where.push(`p.graduation_year = ${add(q.batch)}`);
  if (q.mentoring !== undefined) where.push(`p.willing_to_mentor = ${add(q.mentoring)}`);

  const order = q.sort === 'batch'
    ? 'p.graduation_year desc nulls last, u.last_name, u.first_name'
    : 'u.last_name, u.first_name';
  const limitP = add(q.limit);
  const offsetP = add(offsetOf(q));

  const rows = await db.all(
    `select ${USER_COLS}, ${PROFILE_COLS},
            conn.id as connection_id, conn.status as connection_status, conn.requester_id as connection_requester_id,
            count(*) over() as total
       from users u
       join profiles p on p.user_id = u.id
       ${CONN_LATERAL('$1', 'u.id')}
      where ${where.join(' and ')}
      order by ${order}
      limit ${limitP} offset ${offsetP}`,
    params,
  );

  await recordSearchAppearances(rows.map((row) => row.id), me.id);
  res.json(paginated(rows, q, (r) => ({
    ...toPublicProfile(r, { viewer: me, connected: r.connectionStatus === 'accepted' }),
    connection: connectionState(me.id, r),
  })));
}));

// Values for the filter dropdowns (only from people who are visible in the directory).
directoryRoutes.get('/filters', asyncHandler(async (req, res) => {
  const base = `from profiles p join users u on u.id = p.user_id
     where ${VISIBLE_PROFILE('u.id', null)}`;
  const [programmes, industries, years, locations] = await Promise.all([
    db.all(`select distinct p.programme as v ${base} and p.programme is not null order by 1 limit 200`),
    db.all(`select distinct p.industry as v ${base} and p.industry is not null order by 1 limit 200`),
    db.all(`select distinct p.graduation_year as v ${base} and p.graduation_year is not null order by 1 desc limit 100`),
    db.all(`select distinct p.location as v ${base} and p.location is not null
              and coalesce((u.privacy->>'showLocation')::boolean, true) order by 1 limit 200`),
  ]);
  res.set('Cache-Control', 'private, max-age=300');
  res.json({
    programmes: programmes.map((r) => r.v),
    industries: industries.map((r) => r.v),
    graduationYears: years.map((r) => r.v),
    locations: locations.map((r) => r.v),
  });
}));
