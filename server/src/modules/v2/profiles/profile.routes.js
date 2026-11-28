import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../../../utils/errors.js';
import { asyncHandler } from '../../../utils/http.js';
import { httpUrl, idParam, pagingShape } from '../../../utils/schemas.js';
import { isBlocked, isConnected } from '../../shared/relations.js';
import { PROFILE_COLS, USER_COLS, profileVisibleTo } from '../../shared/sql.js';
import { toPublicProfile } from '../../shared/serializers.js';
import { requireV2MemberPrerequisites } from '../middleware.js';
import { scheduleProfileView } from '../analytics/analytics.service.js';
import { publishNotification } from '../notifications/notifications.service.js';

const visibility = z.enum(['private', 'connections', 'public']);
const optionalDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date.')
  .nullable().optional();
const tags = z.array(z.string().trim().min(1).max(40)).max(30).optional();
const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const empty = z.object({}).strict();
const profileOwnerRoutes = Router();
profileOwnerRoutes.use(authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites);

const educationFields = {
  schoolName: 'school_name',
  degree: 'degree',
  fieldOfStudy: 'field_of_study',
  startDate: 'start_date',
  endDate: 'end_date',
  grade: 'grade',
  coursework: 'coursework',
  honours: 'honours',
  visibility: 'visibility',
};
const experienceFields = {
  kind: 'kind',
  title: 'title',
  organization: 'organization',
  startDate: 'start_date',
  endDate: 'end_date',
  isCurrent: 'is_current',
  description: 'description',
  tags: 'tags',
  visibility: 'visibility',
};
const projectFields = {
  kind: 'kind',
  title: 'title',
  description: 'description',
  tags: 'tags',
  url: 'safe_url',
  status: 'status',
  visibility: 'visibility',
};

const educationSchema = z.object({
  schoolName: z.string().trim().min(1).max(200),
  degree: optionalText(120),
  fieldOfStudy: optionalText(160),
  startDate: optionalDate,
  endDate: optionalDate,
  grade: optionalText(80),
  coursework: tags,
  honours: tags,
  visibility: visibility.default('connections'),
}).strict();
const educationPatchSchema = educationSchema.partial().refine((value) => Object.keys(value).length > 0);

const experienceShape = {
  kind: z.enum(['work', 'leadership', 'volunteer']),
  title: z.string().trim().min(1).max(160),
  organization: z.string().trim().min(1).max(200),
  startDate: optionalDate,
  endDate: optionalDate,
  isCurrent: z.boolean().default(false),
  description: optionalText(3000),
  tags,
  visibility: visibility.default('connections'),
};
const experienceSchema = z.object(experienceShape).strict().superRefine((value, ctx) => {
  if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' });
  }
  if (value.isCurrent && value.endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Current experience cannot have an end date.' });
  }
});
const experiencePatchSchema = z.object(experienceShape).partial().strict()
  .superRefine((value, ctx) => {
    if (!Object.keys(value).length) ctx.addIssue({ code: 'custom', message: 'Provide at least one field to update.' });
    if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date.' });
    }
    if (value.isCurrent && value.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Current experience cannot have an end date.' });
    }
  });

const projectShape = {
  kind: z.enum(['project', 'publication']),
  title: z.string().trim().min(1).max(200),
  description: optionalText(4000),
  tags,
  url: z.union([z.literal('').transform(() => null), httpUrl]).nullable().optional(),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  visibility: visibility.default('connections'),
};
const projectSchema = z.object(projectShape).strict();
const projectPatchSchema = z.object(projectShape).partial().strict()
  .refine((value) => Object.keys(value).length > 0);

const sectionConfigs = [
  { path: '/education', table: 'profile_education', fields: educationFields, createSchema: educationSchema, patchSchema: educationPatchSchema },
  { path: '/experience', table: 'profile_experience', fields: experienceFields, createSchema: experienceSchema, patchSchema: experiencePatchSchema },
  { path: '/projects', table: 'profile_projects', fields: projectFields, createSchema: projectSchema, patchSchema: projectPatchSchema },
];

function installSectionRoutes(config) {
  const router = Router();
  const { table, fields } = config;
  const id = z.object({ id: z.string().uuid() });

  router.get('/', asyncHandler(async (req, res) => {
    const rows = await db.all(
      `select * from ${table} where user_id = $1 order by created_at desc, id`,
      [req.user.id],
    );
    res.json({ data: rows });
  }));
  router.post('/', validate({ body: config.createSchema }), asyncHandler(async (req, res) => {
    const body = req.valid.body;
    const keys = Object.keys(body).filter((key) => fields[key]);
    const columns = keys.map((key) => fields[key]);
    const params = keys.map((key) => body[key] ?? null);
    const placeholders = params.map((_, index) => `$${index + 2}`);
    const row = await db.one(
      `insert into ${table} (user_id, ${columns.join(', ')})
       values ($1, ${placeholders.join(', ')}) returning *`,
      [req.user.id, ...params],
    );
    res.status(201).json({ data: row });
  }));
  router.patch('/:id', validate({ params: id, body: config.patchSchema }), asyncHandler(async (req, res) => {
    const body = req.valid.body;
    const keys = Object.keys(body).filter((key) => fields[key]);
    const assignments = keys.map((key, index) => `${fields[key]} = $${index + 3}`);
    const row = await db.one(
      `update ${table} set ${assignments.join(', ')}
       where id = $1 and user_id = $2 returning *`,
      [req.valid.params.id, req.user.id, ...keys.map((key) => body[key] ?? null)],
    );
    if (!row) throw notFound('We could not find that profile section.');
    res.json({ data: row });
  }));
  router.delete('/:id', validate({ params: id, body: empty }), asyncHandler(async (req, res) => {
    const count = await db.run(`delete from ${table} where id = $1 and user_id = $2`, [req.valid.params.id, req.user.id]);
    if (!count) throw notFound('We could not find that profile section.');
    res.status(204).end();
  }));
  return router;
}

for (const section of sectionConfigs) {
  profileOwnerRoutes.use(section.path, installSectionRoutes(section));
}

const careerSchema = z.object({
  desiredRoles: z.array(z.string().trim().min(1).max(120)).max(30),
  desiredIndustries: z.array(z.string().trim().min(1).max(120)).max(30),
  desiredLocations: z.array(z.string().trim().min(1).max(120)).max(30),
  availability: optionalText(80),
  openToWork: z.boolean(),
  visibility,
}).strict();

profileOwnerRoutes.get('/career-preferences', asyncHandler(async (req, res) => {
  const prefs = await db.one('select * from career_preferences where user_id = $1', [req.user.id]);
  res.json({ data: prefs || {
    desiredRoles: [], desiredIndustries: [], desiredLocations: [],
    availability: null, openToWork: false, visibility: 'private',
  } });
}));
profileOwnerRoutes.put('/career-preferences', validate({ body: careerSchema }), asyncHandler(async (req, res) => {
  const body = req.valid.body;
  const prefs = await db.one(
    `insert into career_preferences
       (user_id, desired_roles, desired_industries, desired_locations, availability, open_to_work, visibility)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (user_id) do update set
       desired_roles = excluded.desired_roles,
       desired_industries = excluded.desired_industries,
       desired_locations = excluded.desired_locations,
       availability = excluded.availability,
       open_to_work = excluded.open_to_work,
       visibility = excluded.visibility
     returning *`,
    [req.user.id, body.desiredRoles, body.desiredIndustries, body.desiredLocations, body.availability, body.openToWork, body.visibility],
  );
  res.json({ data: prefs });
}));

const endorsementParams = z.object({
  id: z.string().uuid(),
  skill: z.string().trim().min(1).max(100),
});
const endorsementListQuery = z.object({ ...pagingShape });

const endorsementRouter = Router();
endorsementRouter.use(authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites);
endorsementRouter.post('/:id/skills/:skill/endorse', validate({ params: endorsementParams, body: empty }), asyncHandler(async (req, res) => {
  const { id: ownerId, skill } = req.valid.params;
  if (ownerId === req.user.id) throw badRequest('You cannot endorse your own skill.');
  if (await isBlocked(db, req.user.id, ownerId) || !(await isConnected(db, req.user.id, ownerId))) {
    throw notFound('You can endorse skills only for an accepted connection.');
  }
  const owner = await db.one(
    `select u.id, p.skills from users u join profiles p on p.user_id = u.id
     where u.id = $1 and u.status = 'active' and u.deactivated_at is null
       and u.verification_status = 'verified' and u.role in ('student', 'alumni')
       and coalesce((u.privacy->>'discoverable')::boolean, true)`,
    [ownerId],
  );
  if (!owner) throw notFound('We could not find that person.');
  if (!(owner.skills || []).some((claimed) => claimed.trim().toLowerCase() === skill.trim().toLowerCase())) {
    throw badRequest('You can endorse only skills listed on this profile.', { skill: 'Choose a skill from the profile.' });
  }
  const endorsement = await tx(async (t) => {
    const row = await t.one(
      `insert into skill_endorsements (owner_user_id, endorser_user_id, skill)
       values ($1, $2, $3)
       on conflict (owner_user_id, endorser_user_id, skill_normalized) do nothing
       returning id, owner_user_id, endorser_user_id, skill, created_at`,
      [ownerId, req.user.id, skill],
    );
    if (row) {
      await publishNotification(t, {
        userId: ownerId,
        type: 'endorsement',
        title: 'Your skill was endorsed',
        body: `${req.user.firstName} ${req.user.lastName} endorsed ${row.skill} on your profile.`,
        data: { skill: row.skill, endorsementId: row.id },
        dedupeKey: `endorsement:${ownerId}:${req.user.id}:${row.id}`,
        emailMessage: {
          to: owner.email,
          subject: 'A new endorsement on your AlumniLink profile',
          text: `${req.user.firstName} ${req.user.lastName} endorsed ${row.skill} on your profile.`,
        },
      });
    }
    return row;
  });
  res.status(endorsement ? 201 : 200).json({ data: endorsement || { endorsed: true } });
}));
endorsementRouter.delete('/:id/skills/:skill/endorse', validate({ params: endorsementParams, body: empty }), asyncHandler(async (req, res) => {
  const count = await db.run(
    `delete from skill_endorsements
     where owner_user_id = $1 and endorser_user_id = $2 and skill_normalized = lower(btrim($3))`,
    [req.valid.params.id, req.user.id, req.valid.params.skill],
  );
  if (!count) throw notFound('We could not find that endorsement.');
  res.status(204).end();
}));
endorsementRouter.get('/:id/endorsements', validate({ params: idParam, query: endorsementListQuery }), asyncHandler(async (req, res) => {
  const targetId = req.valid.params.id;
  if (targetId !== req.user.id) {
    if (await isBlocked(db, req.user.id, targetId) || !(await isConnected(db, req.user.id, targetId))) {
      throw notFound('We could not find those endorsements.');
    }
  }
  const rows = await db.all(
    `select e.skill, count(*)::int as endorsement_count, count(*) over() as total
     from skill_endorsements e join profiles p on p.user_id = e.owner_user_id
     where e.owner_user_id = $1
       and exists (select 1 from unnest(p.skills) claimed where lower(btrim(claimed)) = e.skill_normalized)
     group by e.skill_normalized, e.skill
     order by endorsement_count desc, e.skill
     limit $2 offset $3`,
    [targetId, req.valid.query.limit, (req.valid.query.page - 1) * req.valid.query.limit],
  );
  const total = rows[0]?.total || 0;
  res.json({
    data: rows.map(({ total: _total, ...row }) => row),
    meta: {
      page: req.valid.query.page,
      limit: req.valid.query.limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / req.valid.query.limit),
    },
  });
}));

const recommendationRouter = Router();
// Route-level guards (rather than router-level) keep unknown paths as 404s.
const recommendationGuard = [authenticate, requireRole('student', 'alumni'), ...requireV2MemberPrerequisites];
const requestSchema = z.object({
  authorUserId: z.string().uuid(),
  requestMessage: z.string().trim().max(1000).optional(),
}).strict();
recommendationRouter.post('/recommendations/requests', ...recommendationGuard, validate({ body: requestSchema }), asyncHandler(async (req, res) => {
  const authorId = req.valid.body.authorUserId;
  if (authorId === req.user.id) throw badRequest('You cannot request a recommendation from yourself.');
  if (await isBlocked(db, req.user.id, authorId) || !(await isConnected(db, req.user.id, authorId))) {
    throw notFound('Recommendations can be requested only from an accepted connection.');
  }
  const row = await db.one(
    `insert into recommendation_requests
       (requester_user_id, author_user_id, subject_user_id, request_message)
     values ($1, $2, $1, $3)
     returning id, requester_user_id, author_user_id, subject_user_id, status, request_message, requested_at`,
    [req.user.id, authorId, req.valid.body.requestMessage || null],
  );
  res.status(201).json({ data: row });
}));

recommendationRouter.get('/me/recommendations', ...recommendationGuard, validate({ query: z.object({ ...pagingShape, view: z.enum(['received', 'written', 'all']).default('all') }) }), asyncHandler(async (req, res) => {
  const query = req.valid.query;
  const rows = await db.all(
    `select r.id, r.requester_user_id, r.author_user_id, r.subject_user_id, r.status,
            r.request_message, r.recommendation_text, r.requested_at, r.drafted_at, r.decided_at,
            author.first_name as author_first_name, author.last_name as author_last_name,
            subject.first_name as subject_first_name, subject.last_name as subject_last_name,
            count(*) over() as total
     from recommendation_requests r
     join users author on author.id = r.author_user_id
     join users subject on subject.id = r.subject_user_id
     where (r.subject_user_id = $1 or r.author_user_id = $1)
       and ($2 = 'all' or ($2 = 'received' and r.subject_user_id = $1)
                       or ($2 = 'written' and r.author_user_id = $1))
     order by r.requested_at desc, r.id
     limit $3 offset $4`,
    [req.user.id, query.view, query.limit, (query.page - 1) * query.limit],
  );
  res.json({
    data: rows.map(({ total: _total, ...row }) => row),
    meta: { page: query.page, limit: query.limit, total: Number(rows[0]?.total || 0),
      totalPages: Math.ceil(Number(rows[0]?.total || 0) / query.limit) },
  });
}));

const recommendationUpdateSchema = z.object({
  action: z.enum(['write', 'approve', 'hide', 'withdraw']),
  text: z.string().trim().min(1).max(4000).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.action === 'write' && !value.text) {
    ctx.addIssue({ code: 'custom', path: ['text'], message: 'Enter the recommendation before saving it.' });
  }
});
recommendationRouter.patch('/recommendations/:id', ...recommendationGuard, validate({ params: idParam, body: recommendationUpdateSchema }), asyncHandler(async (req, res) => {
  const { action, text } = req.valid.body;
  const row = await tx(async (t) => {
    const current = await t.one(
      `select id, requester_user_id, author_user_id, subject_user_id, status
       from recommendation_requests where id = $1 for update`,
      [req.valid.params.id],
    );
    if (!current) throw notFound('We could not find that recommendation request.');
    let update;
    if (action === 'write') {
      if (current.authorUserId !== req.user.id || !['requested', 'drafted'].includes(current.status)) {
        throw forbidden('Only the requested author can write this recommendation.');
      }
      update = await t.one(
        `update recommendation_requests set recommendation_text = $2, status = 'drafted', drafted_at = now()
         where id = $1 returning id, author_user_id, subject_user_id, status, recommendation_text, drafted_at, decided_at`,
        [current.id, text],
      );
    } else if (action === 'approve' || action === 'hide') {
      if (current.subjectUserId !== req.user.id || !['drafted', 'approved'].includes(current.status)) {
        throw forbidden('Only the person receiving the recommendation can approve or hide it.');
      }
      const next = action === 'approve' ? 'approved' : 'hidden';
      update = await t.one(
        `update recommendation_requests set status = $2, decided_at = now()
         where id = $1 returning id, author_user_id, subject_user_id, status, recommendation_text, drafted_at, decided_at`,
        [current.id, next],
      );
    } else {
      if (current.requesterUserId !== req.user.id || !['requested', 'drafted'].includes(current.status)) {
        throw forbidden('Only the person who requested this recommendation can withdraw it.');
      }
      update = await t.one(
        `update recommendation_requests set status = 'withdrawn', decided_at = now()
         where id = $1 returning id, author_user_id, subject_user_id, status, recommendation_text, drafted_at, decided_at`,
        [current.id],
      );
    }
    return update;
  });
  res.json({ data: row });
}));

export const profileSectionRoutes = profileOwnerRoutes;
export const endorsementRoutes = endorsementRouter;
export const recommendationRoutes = recommendationRouter;

/** Deterministic, explainable completeness score (0-100) shown only to the owner/admin. */
export function profileStrength(row, sections = {}) {
  const skills = row.skills || [];
  const interests = row.interests || [];
  const goals = row.careerGoals || [];
  const checks = [
    Boolean(row.headline), Boolean(row.bio), Boolean(row.avatarUrl), Boolean(row.avatarAlt),
    Boolean(row.programme && row.graduationYear), Boolean(row.currentCompany || row.jobTitle),
    skills.length >= 3, interests.length >= 2, goals.length >= 1,
    (sections.education || []).length > 0, (sections.experience || []).length > 0,
    Boolean(row.willingToMentor),
  ];
  return checks.filter(Boolean).length * Math.round(100 / checks.length);
}

const fullProfileRouter = Router();
fullProfileRouter.get('/:id/full', authenticate, ...requireV2MemberPrerequisites,
  validate({ params: idParam }), asyncHandler(async (req, res) => {
  const viewer = req.user;
  const row = await db.one(
    `select ${USER_COLS}, ${PROFILE_COLS}, u.status, u.deactivated_at, u.handle,
            u.public_profile_indexable
     from users u join profiles p on p.user_id = u.id
     where u.id = $1`,
    [req.valid.params.id],
  );
  if (!row) throw notFound("We couldn't find this person.");
  const self = row.id === viewer.id;
  const connected = !self && await isConnected(db, viewer.id, row.id);
  if (!self && (await isBlocked(db, viewer.id, row.id))) throw notFound("We couldn't find this person.");
  if (!profileVisibleTo(row, viewer, connected, { admin: viewer.role === 'admin' })) {
    throw notFound("We couldn't find this person.");
  }
  const full = self || viewer.role === 'admin';
  const sections = await loadVisibleSections(row.id, { full, connected });
  const careerPreferences = await db.one(
    `select desired_roles, desired_industries, desired_locations, availability, open_to_work, visibility
     from career_preferences where user_id = $1
       and ($2::boolean or visibility = 'public' or ($3::boolean and visibility = 'connections'))`,
    [row.id, full, connected],
  );
  const endorsements = await db.all(
    `select e.skill, count(*)::int as endorsement_count
     from skill_endorsements e join profiles p on p.user_id = e.owner_user_id
     where e.owner_user_id = $1
       and exists (select 1 from unnest(p.skills) claimed where lower(btrim(claimed)) = e.skill_normalized)
     group by e.skill_normalized, e.skill order by endorsement_count desc, e.skill`,
    [row.id],
  );
  const recommendations = await db.all(
    `select id, recommendation_text, decided_at, author_user_id
     from recommendation_requests
     where subject_user_id = $1 and status = 'approved'
     order by decided_at desc, id`,
    [row.id],
  );
  const connectionCounts = full ? await db.one(
    `select count(*) filter (where status = 'accepted')::int as connections,
            count(*) filter (where status = 'pending' and recipient_id = $1)::int as pending_received,
            count(*) filter (where status = 'pending' and requester_id = $1)::int as pending_sent
     from connections where requester_id = $1 or recipient_id = $1`,
    [row.id],
  ) : null;
  scheduleProfileView(res, row.id, viewer.id);
  res.json({ data: {
    profile: toPublicProfile(row, { viewer, connected }),
    education: sections.education,
    experience: sections.experience,
    projects: sections.projects,
    careerPreferences,
    endorsements,
    recommendations,
    connectionCounts,
    profileStrength: full ? profileStrength(row, sections) : null,
  } });
}));

async function loadVisibleSections(userId, { full, connected }) {
  const visible = `visibility = 'public' or ($2::boolean and visibility = 'connections') or $3::boolean`;
  const [education, experience, projects] = await Promise.all([
    db.all(`select id, school_name, degree, field_of_study, start_date, end_date, grade, coursework, honours, visibility
            from profile_education where user_id = $1 and (${visible})
            order by start_date desc nulls last, created_at desc`, [userId, connected, full]),
    db.all(`select id, kind, title, organization, start_date, end_date, is_current, description, tags, visibility
            from profile_experience where user_id = $1 and (${visible})
            order by start_date desc nulls last, created_at desc`, [userId, connected, full]),
    db.all(`select id, kind, title, description, tags, safe_url, status, visibility
            from profile_projects where user_id = $1 and (status = 'active' or $3::boolean) and (${visible})
            order by created_at desc`, [userId, connected, full]),
  ]);
  return { education, experience, projects };
}

export const fullProfileRoutes = fullProfileRouter;
