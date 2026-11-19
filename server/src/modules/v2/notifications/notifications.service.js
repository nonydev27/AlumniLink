import { randomUUID } from 'node:crypto';
import { db, tx } from '../../../db.js';
import { AppError, badRequest } from '../../../utils/errors.js';
import { getEmailDeliveryProvider } from '../auth/email-provider.js';
import { composeEmailAction } from '../auth/email-actions.js';

export const NOTIFICATION_TYPES = Object.freeze([
  'connection_request',
  'connection_accepted',
  'connection_declined',
  'connection_cancelled',
  'mentorship_started',
  'mentorship_updated',
  'message',
  'alumni_verification',
  'email_verification',
  'password_reset',
  'endorsement',
  'new_device_sign_in',
]);

const isKnownType = (type) => NOTIFICATION_TYPES.includes(type);

/** Call inside the same transaction as the business event. */
export async function publishNotification(database, event, {
  emailProvider = getEmailDeliveryProvider(),
} = {}) {
  if (!isKnownType(event.type)) throw badRequest('That notification type is not supported.', undefined, 'invalid_notification_type');
  if (!event.dedupeKey || typeof event.dedupeKey !== 'string') {
    throw badRequest('A notification idempotency key is required.', undefined, 'notification_key_required');
  }

  const preference = await database.one(
    `select in_app_enabled, email_enabled from notification_preferences
     where user_id = $1 and notification_type = $2`,
    [event.userId, event.type],
  );
  const inAppEnabled = preference?.inAppEnabled ?? true;
  const emailEnabled = preference?.emailEnabled ?? true;
  let notification = null;

  if (inAppEnabled) {
    notification = await database.one(
      `insert into notifications
        (user_id, notification_type, title, body, data, dedupe_key)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       on conflict (user_id, dedupe_key) do update set dedupe_key = excluded.dedupe_key
       returning id, user_id, notification_type, title, body, data, created_at, read_at`,
      [event.userId, event.type, event.title, event.body, JSON.stringify(event.data || {}), event.dedupeKey],
    );
  }

  // An enabled preference is not a delivery capability. Do not queue email
  // unless a real provider adapter is present and the event has a message.
  if (emailEnabled && emailProvider && typeof emailProvider.send === 'function' && event.emailMessage) {
    const payload = {
      to: event.emailMessage.to,
      subject: event.emailMessage.subject,
      text: event.emailMessage.text,
    };
    await database.run(
      `insert into notification_outbox
        (notification_id, user_id, notification_type, channel, dedupe_key, payload)
       values ($1, $2, $3, 'email', $4, $5::jsonb)
       on conflict (dedupe_key) do nothing`,
      [notification?.id || null, event.userId, event.type, `email:${event.dedupeKey}`, JSON.stringify(payload)],
    );
  }
  return notification;
}

function providerFailureCode(error) {
  return typeof error?.code === 'string' && /^[a-z0-9_]{1,80}$/i.test(error.code)
    ? error.code
    : 'provider_delivery_failed';
}

/**
 * Claims durable work with PostgreSQL leases and records delivery only when
 * the selected provider explicitly acknowledges acceptance.
 */
export async function runNotificationWorker({
  provider = getEmailDeliveryProvider(),
  transaction = tx,
  workerId = `notification-worker:${randomUUID()}`,
  limit = 10,
  clock = () => new Date(),
} = {}) {
  if (!provider || typeof provider.send !== 'function') {
    throw new AppError(503, 'email_delivery_unavailable', 'Email delivery is not configured.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw badRequest('Worker batch size must be between 1 and 50.');
  }

  const jobs = await transaction(async (t) => {
    await t.run(
      `update notification_outbox
       set status = 'failed', locked_until = null, locked_by = null,
           last_error = 'attempt_limit_reached'
       where status = 'processing' and locked_until < now() and attempt_count >= max_attempts`,
    );
    await t.run(
      `update notification_delivery_attempts as attempt
       set outcome = 'terminal_failure', completed_at = now(), error_code = 'attempt_limit_reached'
       from notification_outbox as outbox
       where attempt.outbox_id = outbox.id
         and outbox.status = 'failed' and outbox.last_error = 'attempt_limit_reached'
         and attempt.attempt_number = outbox.attempt_count and attempt.outcome = 'started'`,
    );
    const claimed = await t.all(
      `with candidates as (
         select id from notification_outbox
         where attempt_count < max_attempts
           and ((status in ('queued', 'retry') and available_at <= now())
             or (status = 'processing' and locked_until < now()))
         order by available_at, created_at
         for update skip locked
         limit $1
       )
       update notification_outbox as outbox
       set status = 'processing',
           attempt_count = outbox.attempt_count + 1,
           locked_until = now() + interval '2 minutes',
           locked_by = $2
       from candidates
       where outbox.id = candidates.id
       returning outbox.id, outbox.user_id, outbox.notification_type, outbox.dedupe_key,
                 outbox.payload, outbox.attempt_count, outbox.max_attempts`,
      [limit, workerId],
    );
    for (const job of claimed) {
      await t.run(
        `insert into notification_delivery_attempts
          (outbox_id, attempt_number, outcome)
         values ($1, $2, 'started')`,
        [job.id, job.attemptCount],
      );
    }
    return claimed;
  });

  let delivered = 0;
  let retried = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      // Action messages are composed here, at send time, so a live reset or
      // verification token never sits in the durable queue.
      const message = job.payload?.template
        ? composeEmailAction(job.payload)
        : job.payload;
      const acknowledgement = await provider.send({
        ...message,
        idempotencyKey: job.dedupeKey,
      });
      if (!acknowledgement || acknowledgement.acknowledged !== true) {
        const error = new Error('Provider did not acknowledge delivery.');
        error.code = 'provider_ack_missing';
        throw error;
      }
      await transaction(async (t) => {
        const updated = await t.run(
          `update notification_outbox
           set status = 'delivered', delivered_at = now(), locked_until = null,
               locked_by = null, last_error = null
           where id = $1 and status = 'processing' and locked_by = $2`,
          [job.id, workerId],
        );
        if (!updated) {
          const error = new Error('Notification outbox lease is no longer owned by this worker.');
          error.code = 'outbox_lease_lost';
          throw error;
        }
        await t.run(
          `update notification_delivery_attempts
           set outcome = 'delivered', completed_at = now(), provider_reference = $3
           where outbox_id = $1 and attempt_number = $2 and outcome = 'started'`,
          [job.id, job.attemptCount, acknowledgement.providerReference || null],
        );
      });
      delivered += 1;
    } catch (error) {
      const isTerminal = job.attemptCount >= job.maxAttempts;
      const delaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attemptCount - 1)));
      const availableAt = new Date(clock().getTime() + delaySeconds * 1000);
      await transaction(async (t) => {
        await t.run(
          `update notification_outbox
           set status = $3, available_at = $4, locked_until = null, locked_by = null,
               last_error = $5
           where id = $1 and status = 'processing' and locked_by = $2`,
          [job.id, workerId, isTerminal ? 'failed' : 'retry', availableAt, providerFailureCode(error)],
        );
        await t.run(
          `update notification_delivery_attempts
           set outcome = $3, completed_at = now(), error_code = $4
           where outbox_id = $1 and attempt_number = $2 and outcome = 'started'`,
          [job.id, job.attemptCount, isTerminal ? 'terminal_failure' : 'retryable_failure', providerFailureCode(error)],
        );
      });
      if (isTerminal) failed += 1;
      else retried += 1;
    }
  }
  return { claimed: jobs.length, delivered, retried, failed };
}

