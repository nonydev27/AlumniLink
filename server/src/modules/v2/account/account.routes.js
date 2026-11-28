import express, { Router } from 'express';
import { z } from 'zod';
import { config } from '../../../config.js';
import { db, tx } from '../../../db.js';
import { authenticate, authenticateAllowDeactivated, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { AppError, badRequest, conflict, notFound } from '../../../utils/errors.js';
import { asyncHandler } from '../../../utils/http.js';
import { httpUrl, idParam } from '../../../utils/schemas.js';
import { verifyPassword } from '../../auth/auth.service.js';
import { requireV2MemberPrerequisites } from '../middleware.js';
import { audit } from '../../shared/audit.js';
import { detectImageContentType, getMediaStorageProvider, SUPPORTED_IMAGE_TYPES } from './media-storage.js';

const memberRoles = requireRole('student', 'alumni');
const empty = z.object({}).strict();
const handleSchema = z.object({
  handle: z.string().trim().toLowerCase().min(3).max(30)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use letters, numbers, underscores, and hyphens for your handle.'),
}).strict();
const privacySchema = z.object({
  discoverable: z.boolean().optional(),
  showEmployer: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  shareContactWithConnections: z.boolean().optional(),
  networkOnly: z.boolean().optional(),
  openToRecruiters: z.boolean().optional(),
  searchEngineIndexing: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Choose at least one setting to update.');
const passwordConfirmSchema = z.object({ password: z.string().min(1) }).strict();

export const accountRoutes = Router();
accountRoutes.use(authenticate, memberRoles, ...requireV2MemberPrerequisites);

const transitionSchema = z.object({
  programme: z.string().trim().min(2).max(120),
  graduationYear: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 8),
  evidenceUrl: httpUrl.optional(),
}).strict();

accountRoutes.get('/alumni-transition', asyncHandler(async (req, res) => {
  const request = await db.one(
    'select * from alumni_transition_requests where user_id = $1 order by created_at desc limit 1',
    [req.user.id],
  );
  res.json({ data: request || null });
}));

accountRoutes.post('/alumni-transition', validate({ body: transitionSchema }), asyncHandler(async (req, res) => {
  const changingApprovedAlumni = req.user.role === 'alumni' && req.user.verificationStatus === 'verified';
  if (!['student', 'alumni'].includes(req.user.role) || (req.user.role === 'alumni' && !changingApprovedAlumni)) {
    throw badRequest('Only students moving to alumni, or verified alumni correcting approved details, can request a review.');
  }
  const body = req.valid.body;
  if (body.graduationYear > new Date().getFullYear()) {
    throw badRequest('Choose a graduation year that has already passed.');
  }
  if (changingApprovedAlumni && !body.evidenceUrl) {
    throw badRequest('Attach evidence so Alumni Relations can re-verify the change.', { evidenceUrl: 'Evidence is required.' });
  }
  try {
    const request = await db.one(
      `insert into alumni_transition_requests (user_id, programme, graduation_year, evidence_url)
       values ($1, $2, $3, $4) returning *`,
      [req.user.id, body.programme, body.graduationYear, body.evidenceUrl || null],
    );
    res.status(201).json({ data: request });
  } catch (error) {
    if (error.code === '23505') throw conflict('You already have a transition request under review.', 'transition_request_exists');
    throw error;
  }
}));

accountRoutes.get('/settings', asyncHandler(async (req, res) => {
  const [account, preferences, storage] = await Promise.all([
    db.one(
      `select u.id, u.email, u.handle, u.role, u.verification_status, u.terms_accepted_version,
              u.email_verified_at, u.deactivated_at, u.mfa_enabled, u.public_profile_indexable,
              u.privacy, p.headline, p.programme, p.graduation_year, p.avatar_url, p.avatar_alt,
              p.banner_url, p.banner_alt
       from users u join profiles p on p.user_id = u.id where u.id = $1`,
      [req.user.id],
    ),
    db.all('select notification_type, in_app_enabled, email_enabled from notification_preferences where user_id = $1', [req.user.id]),
    db.one(
      `select coalesce(sum(byte_size), 0)::bigint as used_bytes, count(*)::int as asset_count
       from media_assets where owner_user_id = $1 and status = 'confirmed'`,
      [req.user.id],
    ),
  ]);
  if (!account) throw notFound('We could not find your account.');
  res.json({ data: {
    account: {
      id: account.id, email: account.email, handle: account.handle, role: account.role,
      verificationStatus: account.verificationStatus, termsAcceptedVersion: account.termsAcceptedVersion,
      emailVerifiedAt: account.emailVerifiedAt, deactivatedAt: account.deactivatedAt,
      mfaEnabled: account.mfaEnabled, publicProfileIndexable: account.publicProfileIndexable,
    },
    profile: {
      headline: account.headline, programme: account.programme, graduationYear: account.graduationYear,
      avatarUrl: account.avatarUrl, avatarAlt: account.avatarAlt,
      bannerUrl: account.bannerUrl, bannerAlt: account.bannerAlt,
    },
    privacy: account.privacy,
    notificationPreferences: preferences,
    storage: { usedBytes: storage.usedBytes, assetCount: storage.assetCount, limitBytes: config.mediaStorageQuotaBytes },
  } });
}));

accountRoutes.patch('/handle', validate({ body: handleSchema }), asyncHandler(async (req, res) => {
  try {
    const row = await db.one(
      'update users set handle = $2 where id = $1 returning handle, updated_at',
      [req.user.id, req.valid.body.handle],
    );
    res.json({ data: row });
  } catch (error) {
    if (error.code === '23505') throw conflict('That handle is already in use.', 'handle_taken', { handle: 'Choose another handle.' });
    throw error;
  }
}));

accountRoutes.patch('/privacy', validate({ body: privacySchema }), asyncHandler(async (req, res) => {
  const changes = req.valid.body;
  const row = await db.one(
    `update users
     set privacy = privacy || $2::jsonb,
         public_profile_indexable = coalesce($3, public_profile_indexable)
     where id = $1 returning privacy, public_profile_indexable`,
    [req.user.id, JSON.stringify(changes), changes.searchEngineIndexing ?? null],
  );
  res.json({ data: {
    privacy: row.privacy,
    publicProfileIndexable: row.publicProfileIndexable,
  } });
}));

accountRoutes.post('/deactivate', validate({ body: passwordConfirmSchema }), asyncHandler(async (req, res) => {
  if (!(await verifyPassword(req.user.id, req.valid.body.password))) {
    throw badRequest('Your password is not correct.', { password: 'This is not your password.' }, 'wrong_password');
  }
  if (req.user.role === 'admin') throw badRequest('Administrator accounts cannot be deactivated here.');
  const result = await tx(async (t) => {
    const row = await t.one(
      `update users set deactivated_at = coalesce(deactivated_at, now()),
              public_profile_indexable = false
       where id = $1 returning deactivated_at`,
      [req.user.id],
    );
    if (!row) throw notFound('We could not find your account.');
    await t.one("select advance_user_auth_epoch($1, 'account_deactivated') as auth_epoch", [req.user.id]);
    await audit(t, req.user.id, 'account_deactivated', 'user', req.user.id);
    return row;
  });
  res.json({ data: { deactivated: true, deactivatedAt: result.deactivatedAt } });
}));

export const reactivateAccountRoutes = Router();
reactivateAccountRoutes.post('/reactivate', authenticateAllowDeactivated, memberRoles,
  validate({ body: passwordConfirmSchema }), asyncHandler(async (req, res) => {
    if (!(await verifyPassword(req.user.id, req.valid.body.password))) {
      throw badRequest('Your password is not correct.', { password: 'This is not your password.' }, 'wrong_password');
    }
    if (!req.user.deactivatedAt) throw conflict('This account is already active.', 'account_already_active');
    await tx(async (t) => {
      await t.run('update users set deactivated_at = null where id = $1', [req.user.id]);
      await t.one("select advance_user_auth_epoch($1, 'account_reactivated') as auth_epoch", [req.user.id]);
      await audit(t, req.user.id, 'account_reactivated', 'user', req.user.id);
    });
    res.json({ data: { reactivated: true, message: 'Your account is active again. Please sign in to continue.' } });
  }));

export const mediaStorageRoutes = new Router();
mediaStorageRoutes.use(authenticate, memberRoles, ...requireV2MemberPrerequisites);
mediaStorageRoutes.get('/storage', asyncHandler(async (req, res) => {
  const result = await db.one(
    `select coalesce(sum(byte_size), 0)::bigint as used_bytes,
            count(*)::int as asset_count
     from media_assets where owner_user_id = $1 and status = 'confirmed'`,
    [req.user.id],
  );
  res.json({ data: { usedBytes: result.usedBytes, assetCount: result.assetCount, limitBytes: config.mediaStorageQuotaBytes } });
}));

const unavailableMedia = () => {
  throw new AppError(503, 'media_provider_unavailable', 'Media uploads are unavailable until an object-storage provider is configured.');
};

const uploadQuery = z.object({
  altText: z.string().trim().min(1, 'Describe the photo for screen readers.').max(300),
}).strict();

export const mediaRoutes = new Router();
mediaRoutes.use(authenticate, memberRoles, ...requireV2MemberPrerequisites);

// express.json() ignores image/* bodies, so this raw parser can safely run at route level.
mediaRoutes.post('/uploads',
  express.raw({ type: SUPPORTED_IMAGE_TYPES, limit: config.mediaMaxBytes }),
  asyncHandler(async (req, res) => {
    const provider = getMediaStorageProvider();
    if (!provider) unavailableMedia();
    const parsedQuery = uploadQuery.safeParse(req.query);
    if (!parsedQuery.success) {
      throw badRequest('Please check the details you entered and try again.', {
        altText: parsedQuery.error.issues[0]?.message || 'Describe the photo for screen readers.',
      });
    }
    const { altText } = parsedQuery.data;
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!bytes.length || bytes.length > config.mediaMaxBytes) {
      throw badRequest(`Please choose an image under ${Math.floor(config.mediaMaxBytes / (1024 * 1024))} MB.`, { file: 'The image is too large.' }, 'image_too_large');
    }
    // The declared Content-Type only selects the parser; the stored type comes
    // from the bytes themselves so a script cannot masquerade as an image.
    const contentType = detectImageContentType(bytes);
    if (!contentType || !SUPPORTED_IMAGE_TYPES.includes(contentType)) {
      throw badRequest('Please upload a JPEG, PNG or WebP image.', { file: 'Use a JPEG, PNG or WebP image.' }, 'unsupported_image_type');
    }
    const usage = await db.one(
      `select coalesce(sum(byte_size), 0)::bigint as used_bytes
       from media_assets where owner_user_id = $1 and status in ('confirmed', 'pending')`,
      [req.user.id],
    );
    if (usage.usedBytes + bytes.length > config.mediaStorageQuotaBytes) {
      throw new AppError(413, 'storage_quota_exceeded', 'Your media storage quota is full. Remove an image and try again.');
    }
    const objectKey = await provider.put(contentType, bytes);
    try {
      const asset = await db.one(
        `insert into media_assets
           (owner_user_id, status, provider, object_key, content_type, byte_size, alt_text, confirmed_at)
         values ($1, 'confirmed', $2, $3, $4, $5, $6, now())
         returning id, status, provider, content_type, byte_size, alt_text, created_at`,
        [req.user.id, provider.name, objectKey, contentType, bytes.length, altText],
      );
      res.status(201).json({ data: asset });
    } catch (error) {
      await provider.remove(objectKey);
      throw error;
    }
  }));

// Idempotent for local uploads; external adapters can use it to confirm a signed upload.
mediaRoutes.post('/:id/confirm', validate({ params: idParam, body: z.object({}).strict() }),
  asyncHandler(async (req, res) => {
    const provider = getMediaStorageProvider();
    if (!provider) unavailableMedia();
    const asset = await db.one(
      "select * from media_assets where id = $1 and owner_user_id = $2 and status in ('pending', 'confirmed')",
      [req.valid.params.id, req.user.id],
    );
    if (!asset) throw notFound('We could not find that upload.');
    if (asset.status === 'pending') {
      await provider.assertStored(asset.objectKey);
      const confirmed = await db.one(
        `update media_assets set status = 'confirmed', confirmed_at = now()
         where id = $1 and status = 'pending' returning *`,
        [asset.id],
      );
      return res.json({ data: confirmed });
    }
    return res.json({ data: asset });
  }));

mediaRoutes.delete('/:id', validate({ params: idParam, body: z.object({}).strict() }),
  asyncHandler(async (req, res) => {
    const provider = getMediaStorageProvider();
    if (!provider) unavailableMedia();
    const asset = await tx(async (t) => t.one(
      `update media_assets set status = 'deleted', deleted_at = now()
       where id = $1 and owner_user_id = $2 and status <> 'deleted' returning *`,
      [req.valid.params.id, req.user.id],
    ));
    if (!asset) throw notFound('We could not find that upload.');
    await provider.remove(asset.objectKey);
    res.status(204).end();
  }));

const profileMediaSchema = z.object({
  avatarAssetId: z.string().uuid().nullable().optional(),
  bannerAssetId: z.string().uuid().nullable().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, 'Choose an image to update.');

// Attach a confirmed upload to the profile. Only owned assets are accepted, and
// the alt text travels with the asset so screen-reader text cannot drift.
mediaRoutes.patch('/profile-media', validate({ body: profileMediaSchema }), asyncHandler(async (req, res) => {
  const body = req.valid.body;
  const profile = await tx(async (t) => {
    const sets = [];
    const params = [req.user.id];
    for (const [field, urlColumn, altColumn] of [
      ['avatarAssetId', 'avatar_url', 'avatar_alt'],
      ['bannerAssetId', 'banner_url', 'banner_alt'],
    ]) {
      if (!(field in body)) continue;
      let url = null;
      let alt = null;
      if (body[field]) {
        const asset = await t.one(
          `select id, alt_text from media_assets
           where id = $1 and owner_user_id = $2 and status = 'confirmed'`,
          [body[field], req.user.id],
        );
        if (!asset) throw notFound('We could not find that upload.');
        url = `/api/v2/media/${asset.id}/file`;
        alt = asset.altText;
      }
      params.push(url, alt);
      sets.push(`${urlColumn} = $${params.length - 1}, ${altColumn} = $${params.length}`);
    }
    return t.one(
      `update profiles set ${sets.join(', ')}, updated_at = now()
       where user_id = $1 returning avatar_url, avatar_alt, banner_url, banner_alt`,
      params,
    );
  });
  res.json({ data: profile });
}));

export const mfaSettingsRoutes = new Router();
mfaSettingsRoutes.use(authenticate, memberRoles, ...requireV2MemberPrerequisites);
mfaSettingsRoutes.get('/mfa', asyncHandler(async (req, res) => {
  const state = await db.one(
    `select u.mfa_enabled,
            bool_and(g.enabled) as gates_open,
            count(g.gate_name)::int as gate_count
     from users u cross join security_feature_gates g
     where u.id = $1
     group by u.mfa_enabled`,
    [req.user.id],
  );
  res.json({ data: {
    enabled: Boolean(state?.mfaEnabled),
    available: state?.gateCount === 2 && state.gatesOpen,
  } });
}));
mfaSettingsRoutes.post('/mfa/setup', asyncHandler(async () => {
  throw new AppError(503, 'mfa_disabled_until_security_review', 'Multi-factor setup is disabled until the security release checks pass.');
}));
mfaSettingsRoutes.post('/mfa/confirm', asyncHandler(async () => {
  throw new AppError(503, 'mfa_disabled_until_security_review', 'Multi-factor setup is disabled until the security release checks pass.');
}));
mfaSettingsRoutes.delete('/mfa', asyncHandler(async () => {
  throw new AppError(503, 'mfa_disabled_until_security_review', 'Multi-factor changes are disabled until the security release checks pass.');
}));
