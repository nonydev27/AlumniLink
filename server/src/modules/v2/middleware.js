import { db } from '../../db.js';
import { config } from '../../config.js';
import { AppError } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';

const currentTermsVersion = () => {
  if (!Object.values(config.terms).every(Boolean)) {
    throw new AppError(503, 'terms_configuration_unavailable', 'Current terms are not configured.');
  }
  return config.terms.version;
};

async function loadIdentityState(userId) {
  if (!userId) return null;
  return db.one('select email_verified_at, terms_accepted_version from users where id = $1', [userId]);
}

export const requireCurrentTerms = asyncHandler(async (req, res, next) => {
  const version = currentTermsVersion();
  const state = await loadIdentityState(req.user.id);
  if (!state || state.termsAcceptedVersion !== version) {
    throw new AppError(403, 'terms_acceptance_required', 'Accept the current terms to use this feature.');
  }
  next();
});

export const requireVerifiedV2Email = asyncHandler(async (req, res, next) => {
  const state = await loadIdentityState(req.user.id);
  if (!state?.emailVerifiedAt) {
    throw new AppError(403, 'email_verification_required', 'Verify your email address to use this feature.');
  }
  next();
});

export const requireV2MemberPrerequisites = [requireCurrentTerms, requireVerifiedV2Email];

