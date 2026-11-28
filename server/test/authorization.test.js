import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';

// Keep the integration suite self-contained even when run without the CI env.
process.env.CURRENT_TERMS_VERSION ||= '2026-11-01';
process.env.CURRENT_TERMS_EFFECTIVE_AT ||= '2026-11-01T00:00:00Z';
process.env.TERMS_URL ||= 'http://localhost:5173/terms';
process.env.PRIVACY_URL ||= 'http://localhost:5173/privacy';

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');
const { config } = await import('../src/config.js');

const password = 'a-strong-password';
const createdIds = [];

async function seedUser({ role = 'alumni', privacy = {} } = {}) {
  const id = randomUUID();
  const email = `authz-${id.slice(0, 8)}@example.test`;
  const hash = await bcrypt.hash(password, 10);
  createdIds.push(id);
  await pool.query(
    `insert into users
       (id, email, password_hash, role, first_name, last_name, handle, status,
        verification_status, verified_at, email_verified_at, terms_accepted_version,
        terms_accepted_at, privacy)
     values ($1, $2, $3, $4, 'Test', 'Member', $5, 'active', 'verified', now(), now(), $6, now(), $7::jsonb)`,
    [id, email, hash, role, `authz${id.slice(0, 12)}`, config.terms.version, JSON.stringify(privacy)],
  );
  await pool.query(
    `insert into profiles (user_id, programme, graduation_year, batch)
     values ($1, 'Computer Science', 2020, '2020')`,
    [id],
  );
  return { id, email };
}

async function call(origin, method, path, { token, body } = {}) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  if (response.status !== 204) {
    try { payload = await response.json(); } catch { /* non-JSON error */ }
  }
  return { status: response.status, payload };
}

async function signIn(origin, email) {
  const result = await call(origin, 'POST', '/api/v2/auth/login', { body: { email, password } });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  return result.payload.data.tokens.accessToken;
}

const server = createServer(createApp());
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (createdIds.length) {
    // audit_log is append-only, so actors with audit rows cannot be deleted.
    // Keep those rows but deactivate them so they cannot leak into other tests.
    const { rows } = await pool.query(
      'select distinct actor_id from audit_log where actor_id = any($1::uuid[])',
      [createdIds],
    );
    const retained = rows.map((r) => r.actor_id);
    const deletable = createdIds.filter((id) => !retained.includes(id));
    if (deletable.length) await pool.query('delete from users where id = any($1::uuid[])', [deletable]);
    if (retained.length) {
      await pool.query('update users set deactivated_at = now() where id = any($1::uuid[])', [retained]);
    }
  }
  await pool.end();
});

const viewer = await seedUser();
const hidden = await seedUser({ privacy: { discoverable: true, networkOnly: true } });
const blocked = await seedUser();
const publicMember = await seedUser();
const student = await seedUser({ role: 'student' });
const stale = await seedUser();
const admin = await seedUser({ role: 'admin' });
await pool.query('insert into blocks (blocker_id, blocked_id) values ($1, $2)', [viewer.id, blocked.id]);

const viewerToken = await signIn(origin, viewer.email);
const publicToken = await signIn(origin, publicMember.email);
const studentToken = await signIn(origin, student.email);
const adminToken = await signIn(origin, admin.email);

test('v1 member routes require a v2 session and unknown profile IDs are indistinguishable', async () => {
  assert.equal((await call(origin, 'GET', '/api/v1/directory')).status, 401);
  const unknown = await call(origin, 'GET', `/api/v1/users/${randomUUID()}`, { token: viewerToken });
  assert.equal(unknown.status, 404);
  // Malformed IDs are rejected before any lookup, with no hint about existence.
  const malformed = await call(origin, 'GET', '/api/v1/users/not-a-uuid', { token: viewerToken });
  assert.equal(malformed.status, 400);
});

test('directory and profile reads hide network-only, blocked and admin accounts', async () => {
  const list = await call(origin, 'GET', '/api/v1/directory?role=all&limit=50', { token: viewerToken });
  assert.equal(list.status, 200);
  const ids = list.payload.data.map((row) => row.id);
  assert.ok(ids.includes(publicMember.id));
  for (const user of [hidden, blocked, admin]) {
    assert.ok(!ids.includes(user.id), `${user.id} leaked into the directory`);
  }
  assert.equal((await call(origin, 'GET', `/api/v1/users/${hidden.id}`, { token: viewerToken })).status, 404);
  assert.equal((await call(origin, 'GET', `/api/v1/users/${blocked.id}`, { token: viewerToken })).status, 404);
  assert.equal((await call(origin, 'GET', `/api/v1/users/${admin.id}`, { token: viewerToken })).status, 404);
  assert.equal((await call(origin, 'GET', `/api/v1/users/${publicMember.id}`, { token: viewerToken })).status, 200);
});

test('admin queues and admin mutations reject ordinary members', async () => {
  assert.equal((await call(origin, 'GET', '/api/v1/admin/verifications', { token: viewerToken })).status, 403);
  assert.equal((await call(origin, 'GET', '/api/v1/admin/reports', { token: viewerToken })).status, 403);
  const forged = await call(origin, 'PATCH', `/api/v1/admin/verifications/${randomUUID()}`, {
    token: viewerToken, body: { decision: 'approve' },
  });
  assert.equal(forged.status, 403);
  assert.equal((await call(origin, 'GET', '/api/v1/admin/verifications', { token: adminToken })).status, 200);
});

test('approved alumni identity cannot be changed through the ordinary profile route', async () => {
  const result = await call(origin, 'PATCH', '/api/v1/me/profile', {
    token: publicToken, body: { graduationYear: 2018 },
  });
  assert.equal(result.status, 409);
  assert.equal(result.payload.error.code, 'identity_reverification_required');
});

test('reports cannot be used to probe hidden or unknown user IDs', async () => {
  const unknown = await call(origin, 'POST', '/api/v1/reports', {
    token: viewerToken, body: { targetType: 'user', targetId: randomUUID(), reason: 'spam' },
  });
  assert.equal(unknown.status, 404);
  const self = await call(origin, 'POST', '/api/v1/reports', {
    token: viewerToken, body: { targetType: 'user', targetId: viewer.id, reason: 'spam' },
  });
  assert.equal(self.status, 400);
  const hiddenProbe = await call(origin, 'POST', '/api/v1/reports', {
    token: viewerToken, body: { targetType: 'user', targetId: hidden.id, reason: 'spam' },
  });
  assert.equal(hiddenProbe.status, 404);
});

test('mentor preferences are role-scoped, signed and readable in account settings', async () => {
  const studentUpdate = await call(origin, 'PATCH', '/api/v2/me/mentor-preferences', {
    token: studentToken, body: { seekingMentorship: true },
  });
  assert.equal(studentUpdate.status, 200, JSON.stringify(studentUpdate.payload));
  assert.equal(studentUpdate.payload.data.seekingMentorship, true);
  assert.equal((await call(origin, 'PATCH', '/api/v2/me/mentor-preferences', {
    token: studentToken, body: { featuredMentorOptIn: true },
  })).status, 400);

  const alumniUpdate = await call(origin, 'PATCH', '/api/v2/me/mentor-preferences', {
    token: viewerToken, body: { featuredMentorOptIn: true },
  });
  assert.equal(alumniUpdate.status, 200, JSON.stringify(alumniUpdate.payload));
  assert.equal(alumniUpdate.payload.data.featuredMentorOptIn, true);
  assert.equal((await call(origin, 'PATCH', '/api/v2/me/mentor-preferences', {
    token: viewerToken, body: { seekingMentorship: true },
  })).status, 400);

  const settings = await call(origin, 'GET', '/api/v2/me/settings', { token: viewerToken });
  assert.equal(settings.status, 200);
  assert.equal(settings.payload.data.account.featuredMentorOptIn, true);
  const studentSettings = await call(origin, 'GET', '/api/v2/me/settings', { token: studentToken });
  assert.equal(studentSettings.payload.data.profile.seekingMentorship, true);
});

test('batch groups are addressed by programme and year, not by a year alone', async () => {
  const result = await call(origin, 'GET', '/api/v1/groups/by-programme/Computer%20Science/2020', {
    token: viewerToken,
  });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.ok(Array.isArray(result.payload.groups));
  assert.equal((await call(origin, 'GET', '/api/v1/groups/by-programme/Computer%20Science/not-a-year', {
    token: viewerToken,
  })).status, 400);
});

test('signed cursors are viewer-bound, filter-bound and reject tampering', async () => {
  const path = '/api/v1/directory?role=all&limit=1';
  const first = await call(origin, 'GET', path, { token: viewerToken });
  assert.equal(first.status, 200);
  assert.equal(first.payload.data.length, 1);
  const cursor = first.payload.meta.nextCursor;
  assert.ok(cursor, 'expected a next page');
  const second = await call(origin, 'GET', `${path}&cursor=${encodeURIComponent(cursor)}`, { token: viewerToken });
  assert.equal(second.status, 200, JSON.stringify(second.payload));
  assert.notEqual(second.payload.data[0]?.id, first.payload.data[0]?.id);
  assert.equal(second.payload.meta.mode, 'cursor');

  const otherViewer = await call(origin, 'GET', `${path}&cursor=${encodeURIComponent(cursor)}`, { token: publicToken });
  assert.equal(otherViewer.status, 400);
  const otherFilter = await call(origin, 'GET', `/api/v1/directory?role=student&limit=1&cursor=${encodeURIComponent(cursor)}`, { token: viewerToken });
  assert.equal(otherFilter.status, 400);
  const tampered = await call(origin, 'GET', `${path}&cursor=${encodeURIComponent(`${cursor.slice(0, -2)}xx`)}`, { token: viewerToken });
  assert.equal(tampered.status, 400);
});

test('transition approval refuses requests whose account has since changed', async () => {
  const { rows } = await pool.query(
    `insert into alumni_transition_requests (user_id, programme, graduation_year, submitted_role)
     values ($1, 'Computer Science', 2020, 'alumni') returning id`,
    [stale.id],
  );
  await pool.query('update users set deactivated_at = now() where id = $1', [stale.id]);
  const result = await call(origin, 'PATCH', `/api/v2/admin/alumni-transitions/${rows[0].id}`, {
    token: adminToken, body: { decision: 'approve' },
  });
  assert.equal(result.status, 409, JSON.stringify(result.payload));
  assert.equal(result.payload.error.code, 'stale_transition_request');
});
