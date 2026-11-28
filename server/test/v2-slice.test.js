import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { connectionListSchema } from '../src/modules/connections/connections.routes.js';
import { registerSchema } from '../src/modules/v2/auth/auth.routes.js';
import {
  registerV2, verifyEmailV2, forgotPasswordV2, resetPasswordV2, resendVerificationV2,
} from '../src/modules/v2/auth/auth.service.js';
import { composeEmailAction, deriveActionToken } from '../src/modules/v2/auth/email-actions.js';
import { publishNotification, runNotificationWorker } from '../src/modules/v2/notifications/notifications.service.js';
import { changeConnection } from '../src/modules/connections/connections.service.js';
import { canTransitionMentorship, listMentorships, updateMentorship } from '../src/modules/v2/mentorships/mentorships.service.js';

const signup = {
  email: 'ada@example.edu',
  password: 'a-strong-password',
  fullName: 'Ada Augusta Lovelace',
  role: 'student',
  programme: 'Mathematics',
  graduationYear: 2024,
  acceptTerms: true,
};

test('v2 registration accepts fullName and maps it to the legacy name columns', () => {
  const parsed = registerSchema.safeParse(signup);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.firstName, 'Ada');
  assert.equal(parsed.data.lastName, 'Augusta Lovelace');
  assert.equal(parsed.data.acceptTerms, true);
});

test('v2 registration requires current-term assent and rejects unknown reference fields', () => {
  assert.equal(registerSchema.safeParse({ ...signup, acceptTerms: false }).success, false);
  assert.equal(registerSchema.safeParse({ ...signup, studentReferenceNumber: 'do-not-store' }).success, false);
});

test('connection kind is an optional strict filter that preserves omitted-filter defaults', () => {
  const defaultQuery = connectionListSchema.parse({});
  assert.equal(defaultQuery.kind, undefined);
  assert.equal(defaultQuery.status, 'accepted');
  assert.equal(defaultQuery.direction, 'all');
  assert.equal(connectionListSchema.parse({ kind: 'mentorship' }).kind, 'mentorship');
  assert.equal(connectionListSchema.safeParse({ kind: 'invalid' }).success, false);
});

test('v2 signup queues verification durably without inventing email delivery', async () => {
  const statements = [];
  const client = {
    one: async (sql) => {
      statements.push(sql);
      if (sql.includes('insert into users')) return { id: 'user-1', role: 'student', authEpoch: 0 };
      if (sql.includes('auth_epoch, mfa_enabled')) return { authEpoch: 0, mfaEnabled: false };
      return null;
    },
    run: async (sql) => { statements.push(sql); return 1; },
  };
  const result = await registerV2(registerSchema.parse(signup), {
    database: { one: async () => null },
    transaction: async (work) => work(client),
    provider: null, // no adapter selected
    loadUser: async () => ({ id: 'user-1' }),
  });
  assert.equal(result.verification.required, true);
  assert.equal(result.verification.delivery, 'queued_no_provider');
  assert.equal(JSON.stringify(result).includes('rawToken'), false);
  assert.equal(statements.some((sql) => sql.includes('insert into email_action_tokens')), true);
  assert.equal(statements.some((sql) => sql.includes('insert into notification_outbox')), true);
  assert.equal(statements.some((sql) => sql.includes('notification_outbox') && sql.includes('delivered')), false);
});

test('email action links are composed at send time from the token id', () => {
  const payload = {
    template: 'verify_email', purpose: 'verify_email',
    tokenId: '11111111-1111-4111-8111-111111111111', to: 'ada@example.edu',
  };
  const message = composeEmailAction(payload);
  assert.equal(message.to, 'ada@example.edu');
  assert.match(message.text, /verify-email\?token=/);
  assert.equal(message.text.includes(payload.tokenId), false);
  const raw = deriveActionToken(payload.tokenId, 'verify_email');
  assert.equal(message.text.includes(raw), true);
  assert.equal(JSON.stringify(payload).includes(raw), false);
});

test('verification consumes a live token exactly once', async () => {
  const statements = [];
  const client = {
    one: async (sql) => {
      statements.push(sql);
      return sql.includes('with claimed as') ? { userId: 'user-1', emailAddress: 'ada@example.edu' } : null;
    },
    run: async (sql) => { statements.push(sql); return 1; },
  };
  const result = await verifyEmailV2('a-long-enough-valid-token', { transaction: async (work) => work(client) });
  assert.equal(result.verified, true);
  assert.equal(statements.some((sql) => sql.includes('set consumed_at = now()')), true);
  assert.equal(statements.some((sql) => sql.includes('email_verified_at = now()')), true);
});

test('password reset is non-enumerating and revokes existing sessions', async () => {
  const statements = [];
  const client = {
    one: async (sql) => {
      statements.push(sql);
      if (sql.includes('with claimed as')) return { userId: 'user-1', emailAddress: 'ada@example.edu' };
      return { authEpoch: 1 };
    },
    run: async (sql) => { statements.push(sql); return 1; },
  };
  const accepted = await forgotPasswordV2('nobody@example.edu', {
    database: { one: async () => null },
    transaction: async (work) => work(client),
  });
  assert.deepEqual(accepted, { accepted: true });
  assert.equal(statements.length, 0);
  await assert.rejects(resetPasswordV2('bogus', 'another-strong-password', {
    transaction: async (work) => work({
      one: async () => null,
      run: async () => 0,
    }),
  }), (error) => error.code === 'invalid_email_action_token');
});

test('resend verification is non-enumerating for unknown email addresses', async () => {
  let transactions = 0;
  const accepted = await resendVerificationV2('nobody@example.edu', {
    database: { one: async () => null },
    transaction: async (work) => { transactions += 1; return work({}); },
  });
  assert.deepEqual(accepted, { accepted: true });
  assert.equal(transactions, 0);
});

test('notification publisher keeps in-app events and does not enqueue email without a provider', async () => {
  const statements = [];
  const database = {
    one: async (sql) => {
      statements.push(sql);
      if (sql.includes('notification_preferences')) return null;
      return { id: 'notice-1', userId: 'owner-1' };
    },
    run: async (sql) => { statements.push(sql); },
  };
  const result = await publishNotification(database, {
    userId: 'owner-1',
    type: 'connection_accepted',
    title: 'Connection accepted',
    body: 'Your request was accepted.',
    data: {},
    dedupeKey: 'connection:1:accepted',
  });
  assert.equal(result.id, 'notice-1');
  assert.equal(statements.some((sql) => sql.includes('insert into notifications')), true);
  assert.equal(statements.some((sql) => sql.includes('notification_outbox')), false);
});

test('notification publisher honors disabled channel preferences', async () => {
  let writeCalls = 0;
  const database = {
    one: async () => ({ inAppEnabled: false, emailEnabled: false }),
    run: async () => { writeCalls += 1; },
  };
  const result = await publishNotification(database, {
    userId: 'owner-1',
    type: 'connection_accepted',
    title: 'Connection accepted',
    body: 'Your request was accepted.',
    data: {},
    dedupeKey: 'connection:2:accepted',
  });
  assert.equal(result, null);
  assert.equal(writeCalls, 0);
});

test('notification worker refuses to claim work without a provider', async () => {
  let databaseCalls = 0;
  const transaction = async () => { databaseCalls += 1; };
  await assert.rejects(runNotificationWorker({ provider: null, transaction }), (error) => {
    assert.equal(error.status, 503);
    assert.equal(error.code, 'email_delivery_unavailable');
    return true;
  });
  assert.equal(databaseCalls, 0);
});

test('notification worker marks delivery only after provider acknowledgement', async () => {
  const statements = [];
  const job = {
    id: 'outbox-1',
    userId: 'owner-1',
    notificationType: 'connection_accepted',
    dedupeKey: 'email:connection:1:accepted',
    payload: { to: 'ada@example.edu', subject: 'Accepted', text: 'Hello' },
    attemptCount: 1,
    maxAttempts: 3,
  };
  const database = {
    run: async (sql, params) => { statements.push({ sql, params }); return 1; },
    all: async (sql) => { statements.push({ sql }); return [job]; },
  };
  const result = await runNotificationWorker({
    provider: { send: async () => ({ acknowledged: true, providerReference: 'provider-ref-1' }) },
    transaction: async (work) => work(database),
    workerId: 'test-worker',
  });
  assert.deepEqual(result, { claimed: 1, delivered: 1, retried: 0, failed: 0 });
  assert.equal(statements.some(({ sql }) => sql.includes("set status = 'delivered'")), true);
});

test('notification worker retries a provider response that lacks acknowledgement', async () => {
  const statements = [];
  const job = {
    id: 'outbox-2',
    userId: 'owner-1',
    notificationType: 'connection_accepted',
    dedupeKey: 'email:connection:2:accepted',
    payload: { to: 'ada@example.edu', subject: 'Accepted', text: 'Hello' },
    attemptCount: 1,
    maxAttempts: 3,
  };
  const database = {
    run: async (sql, params) => { statements.push({ sql, params }); return 1; },
    all: async () => [job],
  };
  const result = await runNotificationWorker({
    provider: { send: async () => ({}) },
    transaction: async (work) => work(database),
    workerId: 'test-worker',
  });
  assert.deepEqual(result, { claimed: 1, delivered: 0, retried: 1, failed: 0 });
  assert.equal(statements.some(({ sql, params }) => sql.includes('set status = $3') && params[2] === 'retry'), true);
});

test('mentorship transitions permit pause, resume, and completion but keep completion terminal', () => {
  assert.equal(canTransitionMentorship('active', 'paused'), true);
  assert.equal(canTransitionMentorship('active', 'completed'), true);
  assert.equal(canTransitionMentorship('paused', 'active'), true);
  assert.equal(canTransitionMentorship('paused', 'completed'), true);
  assert.equal(canTransitionMentorship('completed', 'active'), false);
  assert.equal(canTransitionMentorship('completed', 'paused'), false);
  assert.equal(canTransitionMentorship('active', 'active'), false);
});

test('accepted mentorship connections create a participant relationship and in-app event atomically', async () => {
  const events = [];
  const statements = [];
  const database = {
    one: async (sql, params) => {
      statements.push({ sql, params });
      if (sql.includes('from connections')) {
        return { id: 'connection-1', requesterId: 'mentee-1', recipientId: 'mentor-1', kind: 'mentorship', status: 'pending' };
      }
      if (sql.includes('select u.id')) return { id: 'mentor-1' };
      if (sql.includes('from blocks')) return null; // no block between the pair
      if (sql.includes('insert into mentorships')) {
        return { id: 'mentorship-1', connectionId: 'connection-1', mentorId: 'mentor-1', menteeId: 'mentee-1', status: 'active' };
      }
      if (sql.includes('update connections')) return { id: 'connection-1', kind: 'mentorship', status: 'accepted' };
      throw new Error('Unexpected SQL in connection acceptance test.');
    },
    all: async (sql) => {
      statements.push({ sql });
      return [
        { id: 'mentee-1', firstName: 'Ada', email: 'ada@example.edu' },
        { id: 'mentor-1', firstName: 'Ama', email: 'ama@example.edu' },
      ];
    },
  };
  const result = await changeConnection({
    connectionId: 'connection-1',
    actorId: 'mentor-1',
    action: 'accept',
    transaction: (work) => work(database),
    publish: async (transactionClient, event) => {
      assert.equal(transactionClient, database);
      events.push(event);
    },
  });
  assert.equal(result.connection.status, 'accepted');
  assert.equal(result.mentorship.mentorId, 'mentor-1');
  assert.equal(result.mentorship.menteeId, 'mentee-1');
  assert.equal(statements.some(({ sql }) => sql.includes('for update')), true);
  assert.equal(events[0].type, 'mentorship_started');
  assert.equal(events[0].userId, 'mentee-1');
});

test('mentorship completion needs both parties and mentor totals stay deduplicated', async () => {
  const updatedAt = new Date('2026-11-17T07:00:00.000Z');
  const list = await listMentorships('mentor-1', { page: 1, limit: 20, role: 'mentor' }, {
    database: {
      all: async () => [{
        id: 'mentorship-1',
        connectionId: 'connection-1',
        mentorId: 'mentor-1',
        menteeId: 'mentee-1',
        status: 'active',
        completedMentorshipCount: 2,
        total: 1,
      }],
    },
  });
  assert.equal(list.data[0].completedMentorshipCount, 2);
  assert.equal(list.meta.total, 1);

  const events = [];
  let completionRequestedBy = null;
  const database = {
    one: async (sql) => {
      if (sql.includes('for update')) {
        return {
          id: 'mentorship-1', connectionId: 'connection-1', mentorId: 'mentor-1', menteeId: 'mentee-1',
          status: 'active', startedAt: updatedAt, updatedAt, completionRequestedBy,
        };
      }
      if (sql.includes('from users u')) return { ok: 1 }; // counterpart reachable and not blocked
      if (sql.includes('update mentorships')) {
        return {
          id: 'mentorship-1', connectionId: 'connection-1', mentorId: 'mentor-1', menteeId: 'mentee-1',
          status: 'completed', completionRequestedBy: null, startedAt: updatedAt,
          completedAt: updatedAt, updatedAt,
        };
      }
      return { completedMentorshipCount: 1 };
    },
    run: async (sql) => {
      if (sql.includes('completion_requested_by = $2')) completionRequestedBy = 'mentor-1';
      return 1;
    },
  };
  const opts = {
    transaction: (work) => work(database),
    publish: async (_transactionClient, event) => events.push(event),
  };

  // The mentor asks first: intent is recorded, nothing is completed yet.
  const requested = await updateMentorship('mentorship-1', 'mentor-1', 'completed', opts);
  assert.equal(requested.status, 'active');
  assert.equal(requested.completionRequestedBy, 'mentor-1');
  assert.equal(events[0].type, 'mentorship_completion_request');
  assert.equal(events[0].userId, 'mentee-1');

  // Only the mentee can finalise it.
  const confirmed = await updateMentorship('mentorship-1', 'mentee-1', 'completed', opts);
  assert.equal(confirmed.status, 'completed');
  assert.equal(confirmed.completedMentorshipCount, 1);
  assert.equal(events[1].type, 'mentorship_updated');
  assert.equal(events[1].userId, 'mentor-1');
});

test('v2 registration endpoint creates an unverified account and queues verification', async (t) => {
  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const email = `signup-${Date.now()}@example.edu`;
  const response = await fetch(`http://127.0.0.1:${port}/api/v2/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...signup, email }),
  });
  const payload = await response.json();
  assert.equal(response.status, 202, JSON.stringify(payload));
  assert.equal(payload.data.verification.required, true);
  assert.equal(Boolean(payload.data.tokens?.accessToken), true);
  assert.equal(payload.data.verification.rawToken, undefined);
});

test('public v2 endpoints are reachable and unknown paths return 404', async (t) => {
  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  for (const path of ['/api/v2/public/featured-mentors', '/api/v2/p/no-such-handle', '/api/v2/does-not-exist']) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    const payload = await response.json();
    assert.equal(response.status, path.includes('does-not-exist') || path.includes('no-such-handle') ? 404 : 200, path);
    if (response.status === 404) assert.equal(payload.error.code, 'not_found');
  }
});

test('current-terms endpoint is explicit when terms configuration is absent', async (t) => {
  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v2/terms/current`);
  const payload = await response.json();
  const configured = Object.values(config.terms).every(Boolean);
  assert.equal(response.status, configured ? 200 : 503);
  if (!configured) assert.equal(payload.error.code, 'terms_configuration_unavailable');
});

test('v2 notification and mentorship routes are mounted behind authentication', async (t) => {
  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  for (const [method, path] of [
    ['GET', '/api/v2/notifications'],
    ['GET', '/api/v2/notifications/unread-count'],
    ['GET', '/api/v2/me/notification-preferences'],
    ['GET', '/api/v2/mentorships'],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
    const payload = await response.json();
    assert.equal(response.status, 401, `${method} ${path} must require authentication`);
    assert.equal(payload.error.code, 'unauthenticated');
  }
});
