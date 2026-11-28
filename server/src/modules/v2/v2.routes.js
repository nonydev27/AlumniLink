import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError, notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { idParam } from '../../utils/schemas.js';
import { NOT_BLOCKED } from '../shared/sql.js';
import { detectImageContentType, getMediaStorageProvider } from './account/media-storage.js';
import { config } from '../../config.js';
import { v2AuthRoutes } from './auth/auth.routes.js';
import { notificationRoutes, notificationPreferenceRoutes } from './notifications/notifications.routes.js';
import { mentorshipRoutes, menteeStatusRoutes } from './mentorships/mentorships.routes.js';
import {
  accountRoutes, mediaRoutes, mediaStorageRoutes, mfaSettingsRoutes, reactivateAccountRoutes,
} from './account/account.routes.js';
import {
  endorsementRoutes, fullProfileRoutes, profileSectionRoutes, recommendationRoutes,
} from './profiles/profile.routes.js';
import { discoveryRoutes } from './discovery/discovery.routes.js';
import { analyticsRoutes } from './analytics/analytics.routes.js';
import { institutionAdminRoutes } from './admin/institutions.routes.js';
import { adminTransitionRoutes } from './account/admin-transitions.routes.js';

const acceptTermsSchema = z.object({ acceptTerms: z.literal(true) }).strict();
export const v2Router = Router();

v2Router.get('/terms/current', asyncHandler(async (req, res) => {
  const { version, effectiveAt, termsUrl, privacyUrl } = config.terms;
  if (!version || !effectiveAt || !termsUrl || !privacyUrl) {
    throw new AppError(503, 'terms_configuration_unavailable', 'Current terms are not configured.');
  }
  res.json({ data: { version, effectiveAt, termsUrl, privacyUrl } });
}));

v2Router.use('/auth', v2AuthRoutes);

// The reviewed institution catalog is public so sign-up can explain which email
// domains will verify a student. Admin routes remain the only write surface.
v2Router.get('/public/institutions', asyncHandler(async (req, res) => {
  const rows = await db.all(
    `select i.id, i.name, i.short_name, m.domain
     from institutions i join institution_domain_mappings m on m.institution_id = i.id
     where i.status = 'active' and m.status = 'active' and m.review_decision = 'approved'
       and m.reviewed_by is not null and m.reviewed_by <> m.proposed_by
     order by lower(i.name), m.domain`,
  );
  res.json({ data: rows });
}));

// Public discovery must be registered before any authenticated catch-all router,
// otherwise its router-level guard answers 401/403 before these paths are seen.
v2Router.use(discoveryRoutes);

// Only images actually shown on a live public profile (or the owner's own
// upload) are readable. A random confirmed asset id is not a capability URL.
v2Router.get('/media/:id/file', optionalAuthenticate, validate({ params: idParam }), asyncHandler(async (req, res) => {
  const provider = getMediaStorageProvider();
  if (!provider) throw new AppError(503, 'media_provider_unavailable', 'Media storage is not configured.');
  const id = req.valid.params.id;
  const asset = await db.one(
    `select object_key, owner_user_id from media_assets where id = $1 and status = 'confirmed'`,
    [id],
  );
  if (!asset) throw notFound("We couldn't find that image.");
  const viewer = req.user;
  if (!viewer || viewer.id !== asset.ownerUserId) {
    const publicPath = `/api/v2/media/${id}/file`;
    const params = [asset.ownerUserId, publicPath];
    let blockClause = 'true';
    if (viewer) {
      params.push(viewer.id);
      blockClause = NOT_BLOCKED('$3', 'u.id');
    }
    const visible = await db.one(
      `select 1 as ok
         from users u join profiles p on p.user_id = u.id
        where u.id = $1 and u.status = 'active' and u.deactivated_at is null
          and u.verification_status = 'verified' and u.role in ('student', 'alumni')
          and u.public_profile_indexable
          and coalesce((u.privacy->>'discoverable')::boolean, true)
          and coalesce((u.privacy->>'networkOnly')::boolean, false) = false
          and (p.avatar_url = $2 or p.banner_url = $2)
          and ${blockClause}`,
      params,
    );
    if (!visible) throw notFound("We couldn't find that image.");
  }
  const { bytes } = await provider.get(asset.objectKey);
  // Never derive the response type from the stored extension or a header.
  const contentType = detectImageContentType(bytes);
  if (!contentType) throw notFound("We couldn't find that image.");
  res.type(contentType).set('X-Content-Type-Options', 'nosniff').send(bytes);
}));

v2Router.post('/me/terms/accept', authenticate, validate({ body: acceptTermsSchema }), asyncHandler(async (req, res) => {
  const version = config.terms.version;
  if (!Object.values(config.terms).every(Boolean)) {
    throw new AppError(503, 'terms_configuration_unavailable', 'Current terms are not configured.');
  }

  const acceptedAt = await tx(async (t) => {
    await t.run(
      `insert into user_terms_acceptances (user_id, terms_version)
       values ($1, $2) on conflict (user_id, terms_version) do nothing`,
      [req.user.id, version],
    );
    const acceptance = await t.one(
      `select accepted_at from user_terms_acceptances
       where user_id = $1 and terms_version = $2`,
      [req.user.id, version],
    );
    await t.run(
      `update users set terms_accepted_version = $2, terms_accepted_at = $3
       where id = $1`,
      [req.user.id, version, acceptance.acceptedAt],
    );
    return acceptance;
  });
  res.json({ data: { accepted: true, version, acceptedAt: acceptedAt.acceptedAt } });
}));

// Account lifecycle routes are mounted first: the other /me routers carry
// router-level member guards that would otherwise block deactivation and
// reactivation before their handlers are reached.
v2Router.use('/me', reactivateAccountRoutes);
v2Router.use('/me', accountRoutes);
v2Router.use('/me', mfaSettingsRoutes);
v2Router.use('/me', mediaStorageRoutes);

v2Router.use('/notifications', notificationRoutes);
v2Router.use('/me', notificationPreferenceRoutes);
v2Router.use('/mentorships', mentorshipRoutes);
v2Router.use('/me', menteeStatusRoutes);
v2Router.use('/me', profileSectionRoutes);
v2Router.use('/media', mediaRoutes);
v2Router.use('/users', fullProfileRoutes);
v2Router.use('/users', endorsementRoutes);
v2Router.use(recommendationRoutes);
v2Router.use(analyticsRoutes);
v2Router.use('/admin/institutions', institutionAdminRoutes);
v2Router.use('/admin/alumni-transitions', adminTransitionRoutes);

