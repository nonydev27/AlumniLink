import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { db, tx } from '../../db.js';
import { AppError, conflict, unauthorized } from '../../utils/errors.js';
import { accessTokenExpiry, hashToken, newRefreshToken, signAccessToken } from '../../utils/tokens.js';
import { ensureBatchGroup } from '../groups/batchGroups.js';
import { loadSelf } from '../me/me.service.js';

// Compared against when the email is unknown, so "no such user" and "wrong password" take equally long.
const DUMMY_HASH = bcrypt.hashSync('alumnilink-dummy-password', config.bcryptRounds);

const EMAIL_TAKEN = () =>
  conflict('An account with this email already exists. Try logging in instead.', 'email_taken', {
    email: 'This email is already registered.',
  });

async function issueTokens(d, user, meta = {}, { mfaAuthenticatedAt = null } = {}) {
  const account = await d.one(
    'select auth_epoch, mfa_enabled from users where id = $1',
    [user.id],
  );
  if (!account) throw unauthorized('Please log in again.', 'invalid_account');
  if (account.mfaEnabled && !mfaAuthenticatedAt) {
    throw new AppError(403, 'mfa_required_use_v2', 'Complete multi-factor sign-in before continuing.');
  }
  if (!account.mfaEnabled) mfaAuthenticatedAt = null;
  const refreshToken = newRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  await d.run(
    `insert into refresh_tokens
       (user_id, token_hash, expires_at, user_agent, auth_epoch, mfa_authenticated_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [user.id, hashToken(refreshToken), expiresAt, String(meta.userAgent || '').slice(0, 255),
      account.authEpoch, mfaAuthenticatedAt],
  );
  const accessToken = signAccessToken({
    ...user,
    authEpoch: account.authEpoch,
    mfaAuthenticatedAt,
  });
  return {
    tokenType: 'Bearer',
    accessToken,
    accessTokenExpiresAt: accessTokenExpiry(accessToken),
    refreshToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
}

export async function register(input, meta, { database = db, transaction = tx } = {}) {
  if (await database.one('select 1 as ok from users where lower(email) = $1', [input.email])) throw EMAIL_TAKEN();

  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  try {
    return await transaction(async (t) => {
      // No role is verified at sign-up: students need a verified institutional
      // email, alumni need Alumni Relations review. This legacy service is kept
      // for token helpers only; /api/v1/auth itself now returns 410.
      const user = await t.one(
        `insert into users (email, password_hash, role, first_name, last_name, verification_status, verified_at)
         values ($1, $2, $3, $4, $5, 'pending', null)
         returning id, role, auth_epoch as auth_epoch`,
        [input.email, passwordHash, input.role, input.firstName, input.lastName],
      );
      await t.run(
        'insert into profiles (user_id, programme, graduation_year, batch) values ($1, $2, $3, $4)',
        [user.id, input.programme, input.graduationYear, String(input.graduationYear)],
      );
      await ensureBatchGroup(t, user.id, input.programme, input.graduationYear);
      const tokens = await issueTokens(t, user, meta);
      return {
        user: await loadSelf(user.id, t),
        tokens,
        message: 'Your account is awaiting verification. Use /api/v2/auth to confirm your email and accept the current terms.',
      };
    });
  } catch (err) {
    if (err.code === '23505') throw EMAIL_TAKEN(); // two sign-ups raced
    throw err;
  }
}

export async function login({ email, password }, meta) {
  const user = await db.one(
    'select id, role, password_hash, status, auth_epoch, mfa_enabled from users where lower(email) = $1',
    [email],
  );
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Your email or password is not correct.', 'invalid_credentials');
  if (user.status !== 'active') {
    throw new AppError(403, 'account_suspended', 'This account has been suspended. Please contact an administrator.');
  }
  if (user.mfaEnabled) {
    throw new AppError(403, 'mfa_required_use_v2', 'Complete multi-factor sign-in before continuing.');
  }
  return tx(async (t) => {
    await t.run('update users set last_login_at = now() where id = $1', [user.id]);
    return { user: await loadSelf(user.id, t), tokens: await issueTokens(t, user, meta) };
  });
}

/** Refresh-token rotation: each token works once. Presenting an already-used token revokes the whole family. */
export async function refresh(token, meta) {
  const hash = hashToken(token);
  const result = await tx(async (t) => {
    const claimed = await t.one(
      `update refresh_tokens r set revoked_at = now()
       from users u
       where r.token_hash = $1 and r.revoked_at is null and r.expires_at > now()
         and u.id = r.user_id and r.auth_epoch = u.auth_epoch
       returning r.user_id, r.auth_epoch, r.mfa_authenticated_at`,
      [hash],
    );
    if (!claimed) {
      const known = await t.one(
        'select user_id, revoked_at from refresh_tokens where token_hash = $1 for update',
        [hash],
      );
      if (known?.revokedAt) {
        await t.run('update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1', [known.userId]);
      } else if (known) {
        await t.run('update refresh_tokens set revoked_at = now() where token_hash = $1', [hash]);
      }
      return { error: unauthorized('Please log in again.', 'invalid_refresh_token') };
    }

    const user = await t.one(
      'select id, role, status, auth_epoch, mfa_enabled from users where id = $1',
      [claimed.userId],
    );
    if (!user || user.status !== 'active') {
      return { error: unauthorized('Please log in again.', 'invalid_refresh_token') };
    }
    if (user.mfaEnabled && !claimed.mfaAuthenticatedAt) {
      return { error: new AppError(403, 'mfa_required_use_v2', 'Complete multi-factor sign-in before continuing.') };
    }
    return {
      tokens: await issueTokens(t, user, meta, { mfaAuthenticatedAt: claimed.mfaAuthenticatedAt }),
    };
  });
  if (result.error) throw result.error;
  return { tokens: result.tokens };
}

export async function logout(token) {
  await db.run('update refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null', [hashToken(token)]);
}

export async function changePassword(userId, { currentPassword, newPassword }, meta) {
  const user = await db.one('select id, role, password_hash from users where id = $1', [userId]);
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, 'wrong_password', 'Your current password is not correct.', {
      currentPassword: 'This is not your current password.',
    });
  }
  const hash = await bcrypt.hash(newPassword, config.bcryptRounds);
  return tx(async (t) => {
    await t.run('update users set password_hash = $2 where id = $1', [userId, hash]);
    await t.one("select advance_user_auth_epoch($1, 'password_changed') as auth_epoch", [userId]);
    return { tokens: await issueTokens(t, user, meta) }; // keeps this device signed in; others must log in again
  });
}

export async function verifyPassword(userId, password) {
  const user = await db.one('select password_hash from users where id = $1', [userId]);
  return Boolean(user) && bcrypt.compare(password, user.passwordHash);
}
