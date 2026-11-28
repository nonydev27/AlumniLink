import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../../config.js';
import { db, tx } from '../../../db.js';
import { ensureBatchGroup } from '../../groups/batchGroups.js';
import { finalizeStudentIdentity } from '../../shared/institution.js';
import { loadSelf } from '../../me/me.service.js';
import { refresh as v1Refresh, logout as v1Logout } from '../../auth/auth.service.js';
import { AppError, conflict, unauthorized } from '../../../utils/errors.js';
import { accessTokenExpiry, newRefreshToken, hashToken, signAccessToken } from '../../../utils/tokens.js';
import { createEmailAction, consumeEmailAction } from './email-actions.js';
import { publishNotification } from '../notifications/notifications.service.js';

const DUMMY_HASH = bcrypt.hashSync('alumnilink-dummy-password', config.bcryptRounds);
const EMAIL_TAKEN = () => conflict(
  'An account with this email already exists. Try logging in instead.',
  'email_taken',
  { email: 'This email is already registered.' },
);

function termsVersion() {
  if (!Object.values(config.terms).every(Boolean)) {
    throw new AppError(503, 'terms_configuration_unavailable', 'Current terms are not configured.');
  }
  return config.terms.version;
}

async function issueTokens(database, user, meta = {}) {
  const account = await database.one('select auth_epoch, mfa_enabled from users where id = $1', [user.id]);
  if (!account) throw unauthorized('Please log in again.', 'invalid_account');
  if (account.mfaEnabled) {
    throw new AppError(503, 'mfa_disabled_until_security_review', 'Multi-factor sign-in is not enabled yet.');
  }
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await database.run(
    `insert into refresh_tokens (user_id, token_hash, expires_at, user_agent, auth_epoch, mfa_authenticated_at)
     values ($1, $2, $3, $4, $5, null)`,
    [user.id, hashToken(refreshToken), expiresAt, String(meta.userAgent || '').slice(0, 255), account.authEpoch],
  );
  const accessToken = signAccessToken({ ...user, authEpoch: account.authEpoch, mfaAuthenticatedAt: null });
  return {
    tokenType: 'Bearer',
    accessToken,
    accessTokenExpiresAt: accessTokenExpiry(accessToken),
    refreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

function suggestedHandle(firstName, lastName) {
  const base = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 26);
  const prefix = base.length >= 3 ? base : `alumni${base}`;
  return `${prefix}${randomBytes(3).toString('hex')}`.slice(0, 30);
}

/**
 * Registration is durable even before an email adapter is selected: the account
 * is created unverified and the verification message is queued in the outbox.
 * Nothing is ever reported as delivered unless a provider acknowledges it.
 */
export async function registerV2(input, {
  database = db,
  transaction = tx,
  meta = {},
  loadUser = loadSelf,
} = {}) {
  const version = termsVersion();
  if (await database.one('select 1 as ok from users where lower(email) = $1', [input.email])) throw EMAIL_TAKEN();

  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  try {
    return await transaction(async (t) => {
      const handle = suggestedHandle(input.firstName, input.lastName);
      // Nobody is network-verified at sign-up. Students are finalized only after
      // email verification against an approved institution domain; alumni stay
      // pending until Alumni Relations reviews them.
      const user = await t.one(
        `insert into users
           (email, password_hash, role, first_name, last_name, handle,
            verification_status, verified_at, terms_accepted_version, terms_accepted_at)
         values ($1, $2, $3, $4, $5, $6, 'pending', null, $7, now())
         returning id, role, auth_epoch`,
        [input.email, passwordHash, input.role, input.firstName, input.lastName, handle, version],
      );
      await t.run(
        'insert into profiles (user_id, programme, graduation_year, batch) values ($1, $2, $3, $4)',
        [user.id, input.programme, input.graduationYear, String(input.graduationYear)],
      );
      await t.run(
        'insert into user_terms_acceptances (user_id, terms_version) values ($1, $2) on conflict do nothing',
        [user.id, version],
      );
      await ensureBatchGroup(t, user.id, input.programme, input.graduationYear);

      const verification = await createEmailAction(t, {
        userId: user.id,
        purpose: 'verify_email',
        emailAddress: input.email,
        ttlMinutes: config.emailVerificationTtlMinutes,
        notificationType: 'email_verification',
      });
      const tokens = await issueTokens(t, user, meta);
      return {
        user: await loadUser(user.id, t),
        tokens,
        verification: {
          required: true,
          expiresAt: verification.expiresAt,
          // Durable intent, independent of the API's provider setting: the
          // worker is the only component that can claim delivery capability.
          delivery: 'queued',
        },
        message: 'Check your email to confirm your address. Your account is ready to use once you verify.',
      };
    });
  } catch (error) {
    if (error.code === '23505') throw EMAIL_TAKEN();
    throw error;
  }
}

/**
 * Security notice for a genuinely new user agent, at most once per device per
 * day. User agents are untrusted display text, never a device identifier.
 */
async function warnOnNewDevice(transaction, user, meta) {
  const userAgent = String(meta.userAgent || 'unknown').slice(0, 255);
  const seenBefore = await transaction.one(
    'select 1 as ok from refresh_tokens where user_id = $1 and user_agent = $2 limit 1',
    [user.id, userAgent],
  );
  const hasHistory = await transaction.one(
    'select 1 as ok from refresh_tokens where user_id = $1 limit 1',
    [user.id],
  );
  if (!hasHistory || seenBefore) return;
  const fingerprint = createHash('sha256').update(userAgent).digest('hex').slice(0, 16);
  const day = new Date().toISOString().slice(0, 10);
  await publishNotification(transaction, {
    userId: user.id,
    type: 'new_device_sign_in',
    title: 'New sign-in detected',
    body: 'Your account was signed in from a device we have not seen before. If this was not you, reset your password.',
    data: { userAgent, detectedOn: day },
    dedupeKey: `new-device:${user.id}:${fingerprint}:${day}`,
    emailMessage: {
      to: user.email,
      subject: 'New sign-in on your AlumniLink account',
      text: 'We noticed a sign-in from a device we have not seen before. If this was not you, reset your password from the sign-in page.',
    },
  });
}

export async function loginV2({ email, password }, meta = {}, { transaction = tx } = {}) {
  const user = await db.one(
    `select id, email, role, password_hash, status, email_verified_at, terms_accepted_version
     from users where lower(email) = $1`,
    [email],
  );
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Your email or password is not correct.', 'invalid_credentials');
  if (user.status !== 'active') {
    throw new AppError(403, 'account_suspended', 'This account has been suspended. Please contact an administrator.');
  }
  return transaction(async (t) => {
    await t.run('update users set last_login_at = now() where id = $1', [user.id]);
    await warnOnNewDevice(t, user, meta);
    // A domain may have been approved after the address was verified, so
    // reconcile student identity on each successful sign-in as well.
    if (user.emailVerifiedAt) await finalizeStudentIdentity(t, user.id, user.email);
    return {
      user: await loadSelf(user.id, t),
      tokens: await issueTokens(t, user, meta),
      verificationRequired: !user.emailVerifiedAt,
      termsAcceptanceRequired: Boolean(config.terms.version) && user.termsAcceptedVersion !== config.terms.version,
    };
  });
}

export async function refreshV2(refreshToken, meta = {}) {
  const result = await v1Refresh(refreshToken, meta);
  return { tokens: result.tokens };
}

export async function logoutV2(refreshToken) {
  await v1Logout(refreshToken);
}

export async function verifyEmailV2(token, { transaction = tx } = {}) {
  const claimed = await transaction(async (t) => {
    const row = await consumeEmailAction(t, { purpose: 'verify_email', token });
    if (!row) throw badEmailToken();
    await t.run('update users set email_verified_at = now() where id = $1', [row.userId]);
    await finalizeStudentIdentity(t, row.userId, row.emailAddress);
    return row;
  });
  return { verified: true, email: claimed.emailAddress };
}

export async function resendVerificationV2(email, { database = db, transaction = tx } = {}) {
  const user = await database.one(
    'select id, email, email_verified_at from users where lower(email) = $1',
    [email],
  );
  if (user && !user.emailVerifiedAt) {
    await transaction(async (t) => createEmailAction(t, {
      userId: user.id,
      purpose: 'verify_email',
      emailAddress: user.email,
      ttlMinutes: config.emailVerificationTtlMinutes,
      notificationType: 'email_verification',
    }));
  }
  return { accepted: true };
}

export async function forgotPasswordV2(email, { database = db, transaction = tx } = {}) {
  const user = await database.one(
    'select id, email, status from users where lower(email) = $1',
    [email],
  );
  if (user?.status === 'active') {
    await transaction(async (t) => createEmailAction(t, {
      userId: user.id,
      purpose: 'password_reset',
      emailAddress: user.email,
      ttlMinutes: config.passwordResetTtlMinutes,
      notificationType: 'password_reset',
    }));
  }
  // Always the same answer, whether or not the address has an account.
  return { accepted: true };
}

export async function resetPasswordV2(token, newPassword, { transaction = tx } = {}) {
  await transaction(async (t) => {
    const claimed = await consumeEmailAction(t, { purpose: 'password_reset', token });
    if (!claimed) throw badEmailToken();
    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await t.run('update users set password_hash = $2 where id = $1', [claimed.userId, passwordHash]);
    await t.one("select advance_user_auth_epoch($1, 'password_changed') as auth_epoch", [claimed.userId]);
  });
  return { reset: true };
}

function badEmailToken() {
  return new AppError(400, 'invalid_email_action_token', 'This link has expired or has already been used. Please request a new one.');
}
