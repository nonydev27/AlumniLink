import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { register as registerV1 } from '../src/modules/auth/auth.service.js';
import { registerSchema } from '../src/modules/v2/auth/auth.routes.js';
import { registerV2 } from '../src/modules/v2/auth/auth.service.js';
import { finalizeStudentIdentity } from '../src/modules/shared/institution.js';
import { PROFILE_WRITE_COLUMNS, USER_WRITE_COLUMNS, assertProfileIdentityWritable } from '../src/modules/me/me.routes.js';
import { assertCanJoinBatchGroup } from '../src/modules/groups/groups.routes.js';

const signup = {
  email: 'ada@example.edu',
  password: 'a-strong-password',
  fullName: 'Ada Lovelace',
  role: 'student',
  programme: 'Mathematics',
  graduationYear: 2024,
  acceptTerms: true,
};

function recordingClient(insertResponse = { id: 'user-1', role: 'student', authEpoch: 0 }) {
  const statements = [];
  return {
    statements,
    database: {
      one: async (sql) => {
        statements.push(sql);
        return sql.includes('select 1 as ok from users') ? null : insertResponse;
      },
      run: async (sql) => { statements.push(sql); return 1; },
    },
    client: {
      one: async (sql) => {
        statements.push(sql);
        if (sql.includes('insert into users')) return insertResponse;
        if (sql.includes('auth_epoch, mfa_enabled')) return { authEpoch: 0, mfaEnabled: false };
        return null;
      },
      run: async (sql) => { statements.push(sql); return 1; },
    },
  };
}

test('student sign-up is never verified in either auth service', async () => {
  const v1 = recordingClient();
  await registerV1({
    email: signup.email, password: signup.password, firstName: 'Ada', lastName: 'Lovelace',
    role: 'student', programme: signup.programme, graduationYear: signup.graduationYear,
  }, {}, {
    database: v1.database,
    transaction: async (work) => work(v1.client),
  });
  const v1Insert = v1.statements.find((sql) => sql.includes('insert into users'));
  assert.match(v1Insert, /'pending', null/);
  assert.doesNotMatch(v1Insert, /'verified'/);

  const v2 = recordingClient();
  await registerV2(registerSchema.parse(signup), {
    database: { one: async () => null },
    transaction: async (work) => work(v2.client),
    provider: null,
    loadUser: async () => ({ id: 'user-1' }),
  });
  const v2Insert = v2.statements.find((sql) => sql.includes('insert into users'));
  assert.match(v2Insert, /'pending', null/);
  assert.doesNotMatch(v2Insert, /'verified'/);
});

test('student verification requires a verified email and an approved institution domain', async () => {
  const statements = [];
  const database = {
    one: async (sql) => {
      statements.push(sql);
      if (sql.includes('institution_domain_mappings')) {
        return { mappingId: 'mapping-1', institutionId: 'institution-1', domain: 'example.edu' };
      }
      if (sql.includes('select role from users')) return { role: 'student' };
      return null;
    },
    run: async (sql) => { statements.push(sql); return 1; },
  };
  const result = await finalizeStudentIdentity(database, 'user-1', 'Ada@Example.edu');
  assert.equal(result.verified, true);
  assert.equal(statements.some((sql) => sql.includes("verification_status = 'verified'")), true);
  assert.equal(statements.some((sql) => sql.includes('institution_domain_mapping_id')), true);

  const unapproved = await finalizeStudentIdentity({
    one: async (sql) => {
      if (sql.includes('institution_domain_mappings')) return null;
      return { role: 'student' };
    },
    run: async () => 1,
  }, 'user-2', 'ada@personal.example');
  assert.equal(unapproved.verified, false);
});

test('banner fields are written to profiles, never users', () => {
  assert.equal(PROFILE_WRITE_COLUMNS.bannerUrl, 'banner_url');
  assert.equal(PROFILE_WRITE_COLUMNS.bannerAlt, 'banner_alt');
  assert.equal(USER_WRITE_COLUMNS.bannerUrl, undefined);
  assert.equal(USER_WRITE_COLUMNS.bannerAlt, undefined);
});

test('approved alumni identity fields need a reviewed transition request', () => {
  assert.doesNotThrow(() => assertProfileIdentityWritable(
    { role: 'alumni', verificationStatus: 'pending' }, { graduationYear: 2019 },
  ));
  assert.doesNotThrow(() => assertProfileIdentityWritable(
    { role: 'student', verificationStatus: 'verified' }, { programme: 'Physics' },
  ));
  assert.throws(() => assertProfileIdentityWritable(
    { role: 'alumni', verificationStatus: 'verified' }, { programme: 'Physics' },
  ), (error) => error.code === 'identity_reverification_required');
});

test('batch-group joins are restricted to the user’s own programme and year', () => {
  const me = { programme: 'Computer Science', graduationYear: 2027 };
  assert.doesNotThrow(() => assertCanJoinBatchGroup(me, { programme: 'computer science', graduationYear: 2027 }));
  assert.throws(() => assertCanJoinBatchGroup(me, { programme: 'Computer Science', graduationYear: 2018 }),
    (error) => error.code === 'batch_group_mismatch');
  assert.throws(() => assertCanJoinBatchGroup(me, { programme: 'Business Administration', graduationYear: 2027 }),
    (error) => error.code === 'batch_group_mismatch');
});

async function withServer(t, fn) {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return fn(`http://127.0.0.1:${port}`);
}

test('v1 auth is retired and v1 member routes keep v2 prerequisites', async (t) => {
  await withServer(t, async (origin) => {
    const frozen = await fetch(`${origin}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signup.email, password: signup.password }),
    });
    const frozenBody = await frozen.json();
    assert.equal(frozen.status, 410);
    assert.equal(frozenBody.error.code, 'v1_auth_retired');

    const guarded = await fetch(`${origin}/api/v1/me`);
    assert.equal(guarded.status, 401);
  });
});

test('auth abuse limiters count every request, including failed logins and neutral 200s', async (t) => {
  await withServer(t, async (origin) => {
    const loginEmail = `rate-limit-${Date.now()}@example.edu`;
    const attemptLogin = () => fetch(`${origin}/api/v2/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: 'definitely-wrong' }),
    });
    for (let i = 0; i < 8; i += 1) assert.equal((await attemptLogin()).status, 401);
    const limited = await attemptLogin();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error.code, 'rate_limited');

    const forgotEmail = `forgot-${Date.now()}@example.edu`;
    const attemptForgot = () => fetch(`${origin}/api/v2/auth/forgot-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    });
    for (let i = 0; i < 8; i += 1) assert.equal((await attemptForgot()).status, 200);
    assert.equal((await attemptForgot()).status, 429);
  });
});
