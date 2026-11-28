import { config } from '../../config.js';
import { AppError } from '../../utils/errors.js';
import { asyncHandler } from '../../utils/http.js';

const currentTermsVersion = () => {
  if (!Object.values(config.terms).every(Boolean)) {
    throw new AppError(503, 'terms_configuration_unavailable', 'Current terms are not configured.');
  }
  return config.terms.version;
};

// authenticate() already loaded this identity incl. verification/terms state.
// The guards deliberately use that snapshot: no writes happen between the
// middleware stages, and re-reading the row here cost two round trips/request.
export const requireCurrentTerms = (req, res, next) => {
  const version = currentTermsVersion();
  if (req.user?.termsAcceptedVersion !== version) {
    return next(new AppError(403, 'terms_acceptance_required', 'Accept the current terms to use this feature.'));
  }
  return next();
};

export const requireVerifiedV2Email = (req, res, next) => {
  if (!req.user?.emailVerifiedAt) {
    return next(new AppError(403, 'email_verification_required', 'Verify your email address to use this feature.'));
  }
  return next();
};

export const requireV2MemberPrerequisites = [requireCurrentTerms, requireVerifiedV2Email];
