import { db } from '../db.js';
import { AppError, forbidden, unauthorized } from '../utils/errors.js';
import { asyncHandler } from '../utils/http.js';
import { verifyAccessToken } from '../utils/tokens.js';

async function authenticateRequest(req, { allowDeactivated = false, allowStaleDeactivatedToken = false } = {}) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  // Nested routers commonly re-run authentication within one request. Cache the
  // verified user for this exact token and option set so the same row is not
  // fetched repeatedly; a different token or option set is never reused.
  const cacheKey = `${allowDeactivated ? 'd' : ''}${allowStaleDeactivatedToken ? 's' : ''}:${token}`;
  if (req.authCache?.key === cacheKey) return req.authCache.user;

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw unauthorized('Your session needs refreshing. Please try again.', 'token_expired');
    }
    throw unauthorized();
  }

  // One row serves authentication, role checks and v2 prerequisites. Reading
  // the same identity three more times per request was pure latency.
  const user = await db.one(
    `select id, email, role, first_name, last_name, status, verification_status, privacy, preferences,
            auth_epoch, deactivated_at, mfa_enabled, email_verified_at, terms_accepted_version
       from users where id = $1`,
    [payload.sub],
  );
  if (!user) throw unauthorized();
  if (user.status !== 'active') {
    throw new AppError(403, 'account_suspended', 'This account has been suspended. Please contact an administrator.');
  }
  if (Number(payload.ae ?? 0) !== Number(user.authEpoch ?? 0)
    && !(allowStaleDeactivatedToken && allowDeactivated && user.deactivatedAt)) {
    throw unauthorized('Your session is no longer valid. Please log in again.', 'session_revoked');
  }
  if (user.mfaEnabled && payload.ma !== true) {
    throw new AppError(403, 'mfa_required_use_v2', 'Complete multi-factor sign-in before continuing.');
  }
  if (user.deactivatedAt && !allowDeactivated) {
    throw new AppError(403, 'account_deactivated', 'This account is deactivated. Reactivate it to continue.');
  }
  req.authCache = { key: cacheKey, user };
  return user;
}

/** Requires a valid access token ("Authorization: Bearer <token>") and loads the current user onto req.user. */
export const authenticate = asyncHandler(async (req, res, next) => {
  req.user = await authenticateRequest(req);
  next();
});

export const authenticateAllowDeactivated = asyncHandler(async (req, res, next) => {
  req.user = await authenticateRequest(req, { allowDeactivated: true, allowStaleDeactivatedToken: true });
  next();
});

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  if (!req.headers.authorization) {
    req.user = null;
    return next();
  }
  req.user = await authenticateRequest(req);
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(forbidden());

/** Alumni must be confirmed by an administrator before they can use networking features. */
export const requireVerified = (req, res, next) =>
  req.user.verificationStatus === 'verified'
    ? next()
    : next(new AppError(
      403,
      'not_verified',
      'Your account is waiting to be verified. You can use this once an administrator has confirmed your details.',
    ));

/** Users can switch AI suggestions off; AI endpoints then politely refuse. */
export const requireAiEnabled = (req, res, next) =>
  req.user.preferences?.aiEnabled === false
    ? next(new AppError(403, 'ai_disabled', 'AI suggestions are turned off. You can turn them back on in your settings.'))
    : next();
