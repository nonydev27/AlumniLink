import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, conflict } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { httpUrl } from '../../utils/schemas.js';
import { uniqueClean } from '../../utils/text.js';
import { verifyPassword } from '../auth/auth.service.js';
import { ensureBatchGroup } from '../groups/batchGroups.js';
import { loadProfileRow, loadSelf } from './me.service.js';

const optText = (max) =>
  z.string().trim().max(max).transform((v) => (v === '' ? null : v)).nullable().optional();
const optUrl = z.union([z.literal('').transform(() => null), httpUrl]).nullable().optional();
const tagList = z.array(z.string().trim().min(1).max(40)).max(25).optional();

const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    headline: optText(160),
    bio: optText(2000),
    programme: z.string().trim().min(2).max(120).optional(),
    graduationYear: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 8).optional(),
    currentCompany: optText(120),
    jobTitle: optText(120),
    industry: optText(120),
    location: optText(120),
    skills: tagList,
    interests: tagList,
    careerGoals: tagList,
    willingToMentor: z.boolean().optional(),
    linkedinUrl: optUrl,
    phone: z.string().trim().max(30).regex(/^[+0-9()\-\s]*$/, 'Use digits, spaces and + - ( ) only.')
      .transform((v) => (v === '' ? null : v)).nullable().optional(),
    avatarUrl: optUrl,
    avatarAlt: optText(200),
    bannerUrl: optUrl,
    bannerAlt: optText(300),
  })
  .strict();

export const PROFILE_WRITE_COLUMNS = Object.freeze({
  headline: 'headline', bio: 'bio', programme: 'programme', graduationYear: 'graduation_year',
  currentCompany: 'current_company', jobTitle: 'job_title', industry: 'industry', location: 'location',
  skills: 'skills', interests: 'interests', careerGoals: 'career_goals', willingToMentor: 'willing_to_mentor',
  linkedinUrl: 'linkedin_url', phone: 'phone', avatarUrl: 'avatar_url', avatarAlt: 'avatar_alt',
  // Migration 007 added banner metadata to profiles, not users.
  bannerUrl: 'banner_url', bannerAlt: 'banner_alt',
});
export const USER_WRITE_COLUMNS = Object.freeze({ firstName: 'first_name', lastName: 'last_name' });

/** Approved alumni identity is immutable until a reviewed alumni transition request applies it. */
export function assertProfileIdentityWritable(user, body) {
  if (user?.role === 'alumni' && user?.verificationStatus === 'verified'
    && ('programme' in body || 'graduationYear' in body)) {
    throw conflict(
      'Your programme and graduation year are locked after alumni approval. Submit an alumni transition request to change them.',
      'identity_reverification_required',
    );
  }
}

const preferencesSchema = z
  .object({
    aiEnabled: z.boolean(),
    explanationLevel: z.enum(['short', 'detailed']),
    highContrast: z.boolean(),
    textScale: z.number().min(0.8).max(2),
    reduceMotion: z.boolean(),
  })
  .partial()
  .strict();

const privacySchema = z
  .object({
    discoverable: z.boolean(),
    showEmployer: z.boolean(),
    showLocation: z.boolean(),
    shareContactWithConnections: z.boolean(),
  })
  .partial()
  .strict();

function buildSet(body, columns, startAt = 2) {
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columns)) {
    if (key in body) {
      params.push(body[key]);
      sets.push(`${column} = $${startAt + params.length - 1}`);
    }
  }
  return { sets, params };
}

export const meRoutes = Router();
meRoutes.use(authenticate);

meRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ user: await loadSelf(req.user.id) });
}));

meRoutes.patch('/profile', validate({ body: profileSchema }), asyncHandler(async (req, res) => {
  const body = { ...req.valid.body };
  for (const key of ['skills', 'interests', 'careerGoals']) if (body[key]) body[key] = uniqueClean(body[key]);
  assertProfileIdentityWritable(req.user, body);

  if (body.graduationYear && req.user.role === 'alumni' && body.graduationYear > new Date().getFullYear()) {
    throw badRequest('Alumni must have already graduated. Choose a past year.', { graduationYear: 'Choose a past year.' });
  }

  await tx(async (t) => {
    const u = buildSet(body, USER_WRITE_COLUMNS);
    if (u.sets.length) await t.run(`update users set ${u.sets.join(', ')} where id = $1`, [req.user.id, ...u.params]);

    const p = buildSet(body, PROFILE_WRITE_COLUMNS);
    if ('graduationYear' in body) { // batch always follows the graduation year
      p.params.push(String(body.graduationYear));
      p.sets.push(`batch = $${1 + p.params.length}`);
    }
    if (p.sets.length) await t.run(`update profiles set ${p.sets.join(', ')} where user_id = $1`, [req.user.id, ...p.params]);

    if ('programme' in body || 'graduationYear' in body) {
      const row = await loadProfileRow(req.user.id, t);
      await ensureBatchGroup(t, req.user.id, row.programme, row.graduationYear);
    }
  });
  res.json({ user: await loadSelf(req.user.id) });
}));

meRoutes.patch('/preferences', validate({ body: preferencesSchema }), asyncHandler(async (req, res) => {
  const row = await db.one(
    'update users set preferences = preferences || $2::jsonb where id = $1 returning preferences',
    [req.user.id, JSON.stringify(req.valid.body)],
  );
  res.json({ preferences: row.preferences });
}));

meRoutes.patch('/privacy', validate({ body: privacySchema }), asyncHandler(async (req, res) => {
  const row = await db.one(
    'update users set privacy = privacy || $2::jsonb where id = $1 returning privacy',
    [req.user.id, JSON.stringify(req.valid.body)],
  );
  res.json({ privacy: row.privacy });
}));

// Deleting an account is destructive, so it needs the password (and the front end should confirm first).
meRoutes.delete('/', validate({ body: z.object({ password: z.string().min(1, 'Please enter your password to confirm.') }) }), asyncHandler(async (req, res) => {
  if (req.user.role === 'admin') throw badRequest('Administrator accounts must be removed by another administrator.');
  if (!(await verifyPassword(req.user.id, req.valid.body.password))) {
    throw badRequest('Your password is not correct.', { password: 'This is not your password.' }, 'wrong_password');
  }
  await db.run('delete from users where id = $1', [req.user.id]); // cascades to profile, messages, requests...
  res.status(204).end();
}));
