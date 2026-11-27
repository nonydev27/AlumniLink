import { Router } from 'express';
import { z } from 'zod';
import { db, tx } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError, notFound } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';
import { idParam } from '../../utils/schemas.js';
import { getMediaStorageProvider } from './account/media-storage.js';
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

// Public discovery must be registered before any authenticated catch-all router,
// otherwise its router-level guard answers 401/403 before these paths are seen.
v2Router.use(discoveryRoutes);

// Confirmed media is publicly readable so public profiles can display photos.
v2Router.get('/media/:id/file', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const provider = getMediaStorageProvider();
  if (!provider) throw new AppError(503, 'media_provider_unavailable', 'Media storage is not configured.');
  const asset = await db.one(
    "select object_key from media_assets where id = $1 and status = 'confirmed'",
    [req.valid.params.id],
  );
  if (!asset) throw notFound("We couldn't find that image.");
  const { bytes, contentType } = await provider.get(asset.objectKey);
  res.type(contentType).send(bytes);
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

