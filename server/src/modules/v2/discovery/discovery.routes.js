import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../../db.js';
import { authenticate, optionalAuthenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { notFound } from '../../../utils/errors.js';
import { asyncHandler } from '../../../utils/http.js';
import { likeEscape } from '../../../utils/text.js';
import { CONN_LATERAL, PROFILE_COLS, USER_COLS, VISIBLE_PROFILE, profileVisibleTo } from '../../shared/sql.js';
import { toPublicProfile } from '../../shared/serializers.js';
import { isBlocked, isConnected } from '../../shared/relations.js';
import { recordProfileView, recordSearchAppearances } from '../analytics/analytics.service.js';
import { requireV2MemberPrerequisites } from '../middleware.js';

const searchQuery = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const discoveryRoutes = Router();

discoveryRoutes.get('/search', authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites,
  validate({ query: searchQuery }), asyncHandler(async (req, res) => {
    const { q, limit } = req.valid.query;
    const pattern = `%${likeEscape(q)}%`;
    const people = await db.all(
      `select ${USER_COLS}, ${PROFILE_COLS}, u.handle,
              conn.id as connection_id, conn.status as connection_status,
              conn.requester_id as connection_requester_id
       from users u
       join profiles p on p.user_id = u.id
       ${CONN_LATERAL('$1', 'u.id')}
       where u.id <> $1
         and ${VISIBLE_PROFILE('u.id', '$1')}
         and (u.first_name ilike $2 or u.last_name ilike $2
              or (u.first_name || ' ' || u.last_name) ilike $2
              or p.headline ilike $2 or p.programme ilike $2
              or p.industry ilike $2 or p.job_title ilike $2
              or (p.current_company ilike $2 and coalesce((u.privacy->>'showEmployer')::boolean, true))
              or exists (select 1 from unnest(p.skills || p.interests) as tag where tag ilike $2))
       order by u.last_name, u.first_name
       limit $3`,
      [req.user.id, pattern, limit],
    );
    const [skills, groups, opportunities] = await Promise.all([
      db.all(
        `select distinct lower(skill) as skill, count(*)::int as profiles
         from profiles p join users u on u.id = p.user_id
         ${CONN_LATERAL('$1', 'u.id')}
         cross join lateral unnest(p.skills) as skill
         where ${VISIBLE_PROFILE('u.id', '$1')}
           and lower(skill) like lower($2)
         group by lower(skill) order by lower(skill) limit $3`,
        [req.user.id, pattern, limit],
      ),
      db.all(
        `select id, name, programme, graduation_year
         from groups
         where name ilike $1 or programme ilike $1
         order by lower(name) limit $2`,
        [pattern, limit],
      ),
      db.all(
        `select o.id, o.type, o.title, o.description, o.company, o.location, o.industry,
                o.is_remote, o.apply_url, o.event_date, o.deadline, o.tags, o.created_at,
                o.posted_by, u.first_name as poster_first_name, u.last_name as poster_last_name
         from opportunities o join users u on u.id = o.posted_by
         ${CONN_LATERAL('$1', 'o.posted_by')}
         where o.status = 'active'
           and ${VISIBLE_PROFILE('o.posted_by', '$1')}
           and (o.title ilike $2 or o.description ilike $2 or o.company ilike $2
                or o.industry ilike $2 or exists (select 1 from unnest(o.tags) as tag where tag ilike $2))
         order by o.created_at desc limit $3`,
        [req.user.id, pattern, limit],
      ),
    ]);

    await recordSearchAppearances(people.map((person) => person.id), req.user.id);
    res.json({
      data: {
        people: people.map((person) => ({
          ...toPublicProfile(person, { viewer: req.user, connected: person.connectionStatus === 'accepted' }),
          handle: person.handle,
        })),
        skills,
        groups,
        opportunities,
      },
    });
  }));

discoveryRoutes.get('/public/stats', asyncHandler(async (req, res) => {
  const stats = await db.one(
    `select count(*) filter (where u.role in ('student', 'alumni'))::int as members,
            count(*) filter (where u.role = 'alumni' and p.willing_to_mentor)::int as mentors,
            (select count(*)::int from groups) as groups,
            (select count(*)::int from opportunities where status = 'active') as opportunities
     from users u left join profiles p on p.user_id = u.id
     where u.status = 'active' and u.deactivated_at is null and u.verification_status = 'verified'`,
  );
  res.json({ data: stats });
}));

discoveryRoutes.get('/public/featured-mentors', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `select ${USER_COLS}, ${PROFILE_COLS}, u.handle
     from users u join profiles p on p.user_id = u.id
     where u.role = 'alumni' and p.willing_to_mentor and u.featured_mentor_opt_in
       and ${VISIBLE_PROFILE('u.id', null)}
     order by u.last_name, u.first_name
     limit 24`,
  );
  res.json({ data: rows.map((row) => ({
    ...toPublicProfile(row),
    handle: row.handle,
  })) });
}));

discoveryRoutes.get('/p/:handle', optionalAuthenticate, asyncHandler(async (req, res) => {
  const handle = z.string().trim().toLowerCase().min(3).max(30)
    .regex(/^[a-z0-9][a-z0-9_-]*$/).safeParse(req.params.handle);
  if (!handle.success) throw notFound("We couldn't find this profile.");
  const row = await db.one(
    `select ${USER_COLS}, ${PROFILE_COLS}, u.status, u.deactivated_at, u.handle,
            u.public_profile_indexable
     from users u join profiles p on p.user_id = u.id
     where lower(u.handle) = $1`,
    [handle.data],
  );
  if (!row) throw notFound("We couldn't find this profile.");
  const viewer = req.user;
  const self = viewer?.id === row.id;
  const connected = Boolean(viewer && !self && await isConnected(db, viewer.id, row.id));
  if (!row.publicProfileIndexable || row.privacy?.searchEngineIndexing !== true
    || !profileVisibleTo(row, viewer, connected)) {
    throw notFound("We couldn't find this profile.");
  }
  if (viewer && !self && await isBlocked(db, viewer.id, row.id)) throw notFound("We couldn't find this profile.");
  const [education, experience, projects, recommendations, endorsements] = await Promise.all([
    db.all(
      `select id, school_name, degree, field_of_study, start_date, end_date, grade, coursework, honours
       from profile_education where user_id = $1 and visibility = 'public'
       order by start_date desc nulls last, created_at desc`,
      [row.id],
    ),
    db.all(
      `select id, kind, title, organization, start_date, end_date, is_current, description, tags
       from profile_experience where user_id = $1 and visibility = 'public'
       order by start_date desc nulls last, created_at desc`,
      [row.id],
    ),
    db.all(
      `select id, kind, title, description, tags, safe_url
       from profile_projects where user_id = $1 and status = 'active' and visibility = 'public'
       order by created_at desc`,
      [row.id],
    ),
    db.all(
      `select recommendation_text, decided_at
       from recommendation_requests
       where subject_user_id = $1 and status = 'approved'
       order by decided_at desc, id`,
      [row.id],
    ),
    db.all(
      `select skill, count(*)::int as endorsement_count
       from skill_endorsements where owner_user_id = $1
       group by skill_normalized, skill order by endorsement_count desc, skill`,
      [row.id],
    ),
  ]);
  if (viewer) await recordProfileView(row.id, viewer.id);
  res.json({ data: {
    profile: { ...toPublicProfile(row, { viewer, connected }), handle: row.handle },
    education, experience, projects, recommendations, endorsements,
  } });
}));

export const publicDiscoveryRoutes = discoveryRoutes;
