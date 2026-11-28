import { createHmac, randomUUID } from 'node:crypto';
import { config } from '../../../config.js';
import { hashToken } from '../../../utils/tokens.js';
import { badRequest } from '../../../utils/errors.js';

/**
 * Email action tokens are derived from their row id with a server-side HMAC.
 * The database stores only the SHA-256 hash; the raw token exists only in the
 * message we hand to the provider, never in a queue payload or a table.
 */
export function deriveActionToken(tokenId, purpose) {
  return createHmac('sha256', config.emailTokenSecret)
    .update(`email-action:${purpose}:${tokenId}`)
    .digest('base64url');
}

const templates = {
  verify_email: (url) => ({
    subject: 'Verify your AlumniLink email address',
    text: `Welcome to AlumniLink. Confirm your email address by opening this link:\n\n${url}\n\nIf you did not create an account, you can ignore this message.`,
  }),
  password_reset: (url) => ({
    subject: 'Reset your AlumniLink password',
    text: `Someone asked to reset your AlumniLink password. Open this link within 60 minutes:\n\n${url}\n\nIf this was not you, you can ignore this message and your password will stay unchanged.`,
  }),
};

/** Build the actual message at send time so no live token is ever persisted in the outbox. */
export function composeEmailAction(payload) {
  if (!payload?.template) {
    return { to: payload?.to, subject: payload?.subject || 'AlumniLink', text: payload?.text || '' };
  }
  const token = deriveActionToken(payload.tokenId, payload.purpose);
  const path = payload.purpose === 'verify_email' ? 'verify-email' : 'reset-password';
  const url = `${config.clientUrl.replace(/\/$/, '')}/${path}?token=${encodeURIComponent(token)}`;
  const template = templates[payload.template];
  if (!template) throw new Error(`Unknown email template: ${payload.template}`);
  return { to: payload.to, ...template(url) };
}

/** Called inside the caller's transaction. Returns the raw token once, for the outbox composer. */
export async function createEmailAction(database, {
  userId,
  purpose,
  emailAddress,
  ttlMinutes,
  notificationType,
}) {
  if (!['verify_email', 'password_reset', 'change_email'].includes(purpose)) {
    throw badRequest('That email action is not supported.', undefined, 'invalid_email_action');
  }
  const tokenId = randomUUID();
  const rawToken = deriveActionToken(tokenId, purpose);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await database.run(
    `update email_action_tokens
     set invalidated_at = now()
     where user_id = $1 and purpose = $2 and lower(email_address) = lower($3)
       and consumed_at is null and invalidated_at is null`,
    [userId, purpose, emailAddress],
  );
  await database.run(
    `insert into email_action_tokens (id, user_id, purpose, email_address, token_hash, expires_at)
     values ($1, $2, $3, $4, $5, $6)`,
    [tokenId, userId, purpose, emailAddress, hashToken(rawToken), expiresAt],
  );
  await database.run(
    `insert into notification_outbox
       (notification_id, user_id, notification_type, channel, dedupe_key, payload)
     values (null, $1, $2, 'email', $3, $4::jsonb)
     on conflict (dedupe_key) do nothing`,
    [userId, notificationType, `email:${purpose}:${tokenId}`, JSON.stringify({
      template: purpose,
      purpose,
      tokenId,
      to: emailAddress,
      clientUrl: config.clientUrl,
    })],
  );
  return { tokenId, rawToken, expiresAt: expiresAt.toISOString() };
}

/** Atomically consumes a live token and invalidates its siblings. */
export async function consumeEmailAction(database, { purpose, token }) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
    throw badRequest('This link is not valid.', undefined, 'invalid_email_action_token');
  }
  return database.one(
    `with claimed as (
       update email_action_tokens
       set consumed_at = now()
       where token_hash = $1 and purpose = $2 and consumed_at is null
         and invalidated_at is null and expires_at > now()
       returning id, user_id, email_address, purpose
     )
     select claimed.* from claimed`,
    [hashToken(token), purpose],
  );
}
