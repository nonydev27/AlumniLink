import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDir = path.join(serverDir, 'db', 'migrations');
const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;

const expectSqlCode = (query, code) => assert.rejects(query, (error) => error.code === code);

test('versioned schema upgrades v1 rows safely and enforces v2 data invariants', {
  skip: !databaseUrl && 'Set MIGRATION_TEST_DATABASE_URL to a disposable PostgreSQL database',
}, async () => {
  const client = new pg.Client({ connectionString: databaseUrl });
  const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  try {
    await client.query(`create schema "${schema}"`);
    await client.query(`set search_path to "${schema}", public`);

    await client.query(await fs.readFile(path.join(migrationDir, '001_init.sql'), 'utf8'));

    const legacyUserId = randomUUID();
    await client.query(
      `insert into users (id, email, password_hash, role, first_name, last_name)
       values ($1, 'legacy@legacy.edu', 'fixture-hash', 'student', 'Legacy', 'Member')`,
      [legacyUserId],
    );
    await client.query(
      'insert into profiles (user_id, headline) values ($1, $2)',
      [legacyUserId, 'Legacy profile'],
    );
    await client.query(
      `insert into refresh_tokens (user_id, token_hash, expires_at)
       values ($1, 'legacy-refresh-hash', now() + interval '1 day')`,
      [legacyUserId],
    );

    const migrationFiles = (await fs.readdir(migrationDir))
      .filter((name) => name > '001_init.sql' && name.endsWith('.sql'))
      .sort();
    assert.deepEqual(migrationFiles, [
      '002_identity_and_security.sql',
      '003_notifications_and_mentorship.sql',
      '004_profiles_and_recommendations.sql',
      '005_media_analytics_account_settings.sql',
      '006_auth_epoch_and_analytics_rollup.sql',
      '007_public_profile_details.sql',
      '008_alumni_transition_requests.sql',
      '009_lock_verified_alumni_identity.sql',
      '010_moderation_and_mentorship.sql',
    ]);
    for (const filename of migrationFiles) {
      await client.query(await fs.readFile(path.join(migrationDir, filename), 'utf8'));
    }

    const legacy = (await client.query(
      `select u.auth_epoch, u.mfa_enabled, u.email_verified_at, u.terms_accepted_at,
              u.institution_id, p.headline,
              (select count(*) from refresh_tokens r where r.user_id = u.id and r.revoked_at is null) as live_refresh
       from users u join profiles p on p.user_id = u.id where u.id = $1`,
      [legacyUserId],
    )).rows[0];
    assert.equal(legacy.auth_epoch, 0);
    assert.equal(legacy.mfa_enabled, false);
    assert.equal(legacy.email_verified_at, null);
    assert.equal(legacy.terms_accepted_at, null);
    assert.equal(legacy.institution_id, null);
    assert.equal(legacy.headline, 'Legacy profile');
    assert.equal(legacy.live_refresh, '1');

    const verifiedAlumniId = randomUUID();
    await client.query(
      `insert into users (id, email, password_hash, role, first_name, last_name, verification_status, verified_at)
       values ($1, 'locked@alumni.example.edu', 'fixture-hash', 'alumni', 'Locked', 'Alumnus', 'verified', now())`,
      [verifiedAlumniId],
    );
    await client.query(
      `insert into profiles (user_id, programme, graduation_year, batch)
       values ($1, 'Computer Science', 2018, '2018')`,
      [verifiedAlumniId],
    );
    await expectSqlCode(
      client.query("update profiles set programme = 'Unreviewed' where user_id = $1", [verifiedAlumniId]),
      'P0001',
    );
    await expectSqlCode(
      client.query('update profiles set graduation_year = 2020 where user_id = $1', [verifiedAlumniId]),
      'P0001',
    );
    await client.query("select set_config('app.identity_transition_user', $1, false)", [verifiedAlumniId]);
    await client.query(
      `update profiles set programme = 'Reviewed Studies', graduation_year = 2019, batch = '2019'
       where user_id = $1`,
      [verifiedAlumniId],
    );
    await client.query("select set_config('app.identity_transition_user', '', false)");
    const reviewedIdentity = (await client.query(
      'select programme, graduation_year from profiles where user_id = $1', [verifiedAlumniId],
    )).rows[0];
    assert.equal(reviewedIdentity.programme, 'Reviewed Studies');
    assert.equal(reviewedIdentity.graduation_year, 2019);

    const tier2Columns = await client.query(
      `select table_name, column_name from information_schema.columns
        where table_schema = $1 and (
          (table_name = 'reports' and column_name in ('content_snapshot', 'target_author_id'))
          or (table_name = 'mentorships' and column_name = 'completion_requested_by'))`,
      [schema],
    );
    assert.deepEqual(tier2Columns.rows.map((r) => `${r.table_name}.${r.column_name}`).sort(), [
      'mentorships.completion_requested_by', 'reports.content_snapshot', 'reports.target_author_id',
    ]);
    const deletedStatuses = await client.query(
      `select t.table_name, c.constraint_name
         from information_schema.check_constraints c
         join information_schema.constraint_column_usage t on t.constraint_name = c.constraint_name
        where c.constraint_schema = $1 and c.check_clause like '%deleted%'`,
      [schema],
    );
    assert.ok(deletedStatuses.rows.length >= 3, 'author-delete status must be allowed on messages, posts and opportunities');
    await client.query("insert into audit_log (action, entity, meta) values ('probe', 'report', '{}')");
    await expectSqlCode(
      client.query("update audit_log set action = 'tampered' where action = 'probe'"),
      'P0001',
    );

    const gateRows = (await client.query(
      'select gate_name, enabled from security_feature_gates order by gate_name',
    )).rows;
    assert.deepEqual(gateRows, [
      { gate_name: 'mfa_authentication', enabled: false },
      { gate_name: 'mfa_enrollment', enabled: false },
    ]);
    await expectSqlCode(
      client.query(
        `update users
         set mfa_enabled = true, mfa_secret_encrypted = 'ciphertext', mfa_enrolled_at = now()
         where id = $1`,
        [legacyUserId],
      ),
      'P0001',
    );
    await expectSqlCode(
      client.query('select transition_user_mfa($1, true, $2)', [legacyUserId, 'ciphertext']),
      'P0001',
    );
    await expectSqlCode(
      client.query(
        'update users set auth_epoch = auth_epoch + 1 where id = $1',
        [legacyUserId],
      ),
      'P0001',
    );
    assert.equal(
      (await client.query('select auth_epoch from users where id = $1', [legacyUserId])).rows[0].auth_epoch,
      0,
      'failed gate/unguarded writes must not advance the auth epoch',
    );

    const refColumn = await client.query(
      `select count(*)::int as count
       from information_schema.columns
       where table_schema = $1
         and column_name ~* '(student.*(index|reference)|(index|reference).*student)'`,
      [schema],
    );
    assert.equal(refColumn.rows[0].count, 0);

    const proposerId = randomUUID();
    const reviewerId = randomUUID();
    const memberId = randomUUID();
    const mismatchId = randomUUID();
    const mfaUserId = randomUUID();
    await client.query(
      `insert into users (id, email, password_hash, role, first_name, last_name) values
       ($1, 'catalog-owner@example.edu', 'fixture-hash', 'admin', 'Catalog', 'Owner'),
       ($2, 'catalog-reviewer@example.edu', 'fixture-hash', 'admin', 'Catalog', 'Reviewer'),
       ($3, 'member@north.example.edu', 'fixture-hash', 'student', 'North', 'Member'),
       ($4, 'member@elsewhere.example.edu', 'fixture-hash', 'student', 'Other', 'Member'),
       ($5, 'mfa@legacy.edu', 'fixture-hash', 'student', 'MFA', 'Member')`,
      [proposerId, reviewerId, memberId, mismatchId, mfaUserId],
    );

    const institutionId = randomUUID();
    const domainMappingId = randomUUID();
    await client.query(
      'insert into institutions (id, name, short_name) values ($1, $2, $3)',
      [institutionId, 'North University', 'North'],
    );
    await client.query(
      `insert into institution_domain_mappings
        (id, institution_id, domain, status, evidence_reference, evidence_summary,
         proposed_by, review_decision, reviewed_by, reviewed_at)
       values ($1, $2, 'north.example.edu', 'active', 'https://north.example.edu/evidence',
               'Institutional evidence confirmed independently', $3, 'approved', $4, now())`,
      [domainMappingId, institutionId, proposerId, reviewerId],
    );
    await expectSqlCode(
      client.query(
        `insert into institution_domain_mappings
          (institution_id, domain, proposed_by)
         values ($1, 'north.example.edu', $2)`,
        [institutionId, proposerId],
      ),
      '23505',
    );
    await expectSqlCode(
      client.query(
        `insert into institution_domain_mappings
          (institution_id, domain, proposed_by)
         values ($1, '*.unsafe.example.edu', $2)`,
        [institutionId, proposerId],
      ),
      '23514',
    );
    await expectSqlCode(
      client.query(
        `insert into institution_domain_mappings
          (institution_id, domain, proposed_by)
         values ($1, 'student.example.edu', $2)`,
        [institutionId, legacyUserId],
      ),
      'P0001',
    );

    await expectSqlCode(
      client.query(
        `update users
         set email_verified_at = now(), institution_id = $1, institution_domain_mapping_id = $2
         where id = $3`,
        [institutionId, domainMappingId, mismatchId],
      ),
      'P0001',
    );
    await client.query(
      `update users
       set email_verified_at = now(), institution_id = $1, institution_domain_mapping_id = $2
       where id = $3`,
      [institutionId, domainMappingId, memberId],
    );
    await expectSqlCode(
      client.query(
        'update users set pending_email = $1 where id = $2',
        ['member@north.example.edu', mismatchId],
      ),
      '23505',
    );
    await client.query(
      'update users set pending_email = $1 where id = $2',
      ['pending@elsewhere.example.edu', mismatchId],
    );
    await expectSqlCode(
      client.query(
        `insert into users (email, password_hash, role, first_name, last_name)
         values ('pending@elsewhere.example.edu', 'fixture-hash', 'student', 'New', 'Account')`,
      ),
      '23505',
    );
    assert.equal(
      (await client.query('select institution_id from users where id = $1', [memberId])).rows[0].institution_id,
      institutionId,
    );
    assert.equal(
      (await client.query(
        'select count(*)::int as count from institution_domain_audit where mapping_id = $1',
        [domainMappingId],
      )).rows[0].count,
      1,
      'domain mapping changes must be audited automatically',
    );
    await expectSqlCode(
      client.query(
        `update institution_domain_mappings set domain = 'changed.example.edu' where id = $1`,
        [domainMappingId],
      ),
      'P0001',
    );
    await expectSqlCode(
      client.query(
        `update institution_domain_audit set action = 'rewritten' where mapping_id = $1`,
        [domainMappingId],
      ),
      'P0001',
    );

    const notificationId = randomUUID();
    await client.query(
      `insert into notifications
        (id, user_id, notification_type, title, body, dedupe_key)
       values ($1, $2, 'connection', 'Connection update', 'A connection was accepted', 'fixture:event:1')`,
      [notificationId, memberId],
    );
    await expectSqlCode(
      client.query(
        `insert into notifications
          (user_id, notification_type, title, body, dedupe_key)
         values ($1, 'connection', 'Duplicate', 'Duplicate event', 'fixture:event:1')`,
        [memberId],
      ),
      '23505',
    );
    await expectSqlCode(
      client.query(
        `insert into notification_outbox
          (notification_id, user_id, notification_type, channel, dedupe_key, status)
         values ($1, $2, 'connection', 'email', 'fixture:outbox:1', 'processing')`,
        [notificationId, memberId],
      ),
      '23514',
    );
    await client.query(
      `insert into notification_outbox
        (notification_id, user_id, notification_type, channel, dedupe_key)
       values ($1, $2, 'connection', 'email', 'fixture:outbox:1')`,
      [notificationId, memberId],
    );
    await expectSqlCode(
      client.query(
        `insert into notification_outbox
          (notification_id, user_id, notification_type, channel, dedupe_key, payload)
         values ($1, $2, 'connection', 'email', 'fixture:outbox:secret',
                 '{"verificationToken":"raw-token"}'::jsonb)`,
        [notificationId, memberId],
      ),
      '23514',
    );

    const connectionId = randomUUID();
    await client.query(
      `insert into connections (id, requester_id, recipient_id, kind, status)
       values ($1, $2, $3, 'mentorship', 'accepted')`,
      [connectionId, memberId, mismatchId],
    );
    await client.query(
      `insert into mentorships (connection_id, mentor_id, mentee_id)
       values ($1, $2, $3)`,
      [connectionId, memberId, mismatchId],
    );
    const invalidConnectionId = randomUUID();
    await client.query(
      `insert into connections (id, requester_id, recipient_id, kind, status)
       values ($1, $2, $3, 'connect', 'accepted')`,
      [invalidConnectionId, memberId, legacyUserId],
    );
    await expectSqlCode(
      client.query(
        `insert into mentorships (connection_id, mentor_id, mentee_id)
         values ($1, $2, $3)`,
        [invalidConnectionId, memberId, legacyUserId],
      ),
      'P0001',
    );

    await expectSqlCode(
      client.query(
        `insert into media_assets
          (owner_user_id, status, content_type, byte_size, alt_text, confirmed_at)
         values ($1, 'confirmed', 'image/png', 1024, 'Profile image', now())`,
        [memberId],
      ),
      '23514',
    );
    const viewerHash = Buffer.alloc(32, 7);
    await client.query(
      `insert into profile_view_events (profile_owner_id, viewer_key_hash, viewed_on)
       values ($1, $2, current_date)`,
      [memberId, viewerHash],
    );
    await expectSqlCode(
      client.query(
        `insert into profile_view_events (profile_owner_id, viewer_key_hash, viewed_on)
         values ($1, $2, current_date)`,
        [memberId, viewerHash],
      ),
      '23505',
    );

    const pendingChallenge = randomUUID();
    await client.query(
      `insert into mfa_login_challenges (user_id, challenge_hash, auth_epoch, expires_at)
       values ($1, $2, 0, now() + interval '5 minutes')`,
      [mfaUserId, `challenge-${pendingChallenge}`],
    );
    await client.query(
      `insert into mfa_recovery_codes (user_id, code_hash) values ($1, 'recovery-hash-once')`,
      [mfaUserId],
    );
    await client.query(
      `insert into refresh_tokens (user_id, token_hash, expires_at)
       values ($1, 'mfa-transition-refresh', now() + interval '1 day')`,
      [mfaUserId],
    );
    await client.query(
      `update security_feature_gates
       set enabled = true, enabled_at = now(), enabled_by = $1, evidence_reference = 'test-only release evidence'
       where gate_name in ('mfa_enrollment', 'mfa_authentication')`,
      [proposerId],
    );
    const activation = await client.query(
      'select transition_user_mfa($1, true, $2) as auth_epoch',
      [mfaUserId, 'encrypted-test-secret'],
    );
    assert.equal(activation.rows[0].auth_epoch, 1);
    const activated = (await client.query(
      `select auth_epoch, mfa_enabled, mfa_secret_encrypted,
              (select count(*) from refresh_tokens where user_id = $1 and revoked_at is null) as live_refresh,
              (select count(*) from mfa_login_challenges where user_id = $1 and consumed_at is null) as live_challenges,
              (select count(*) from mfa_recovery_codes where user_id = $1) as recovery_codes
       from users where id = $1`,
      [mfaUserId],
    )).rows[0];
    assert.equal(activated.auth_epoch, 1);
    assert.equal(activated.mfa_enabled, true);
    assert.equal(activated.mfa_secret_encrypted, 'encrypted-test-secret');
    assert.equal(activated.live_refresh, '0');
    assert.equal(activated.live_challenges, '0');
    assert.equal(activated.recovery_codes, '0');
    await expectSqlCode(
      client.query(
        `insert into refresh_tokens
          (user_id, token_hash, expires_at, auth_epoch)
         values ($1, 'missing-mfa-proof', now() + interval '1 day', 1)`,
        [mfaUserId],
      ),
      'P0001',
    );
    await client.query(
      `insert into refresh_tokens
        (user_id, token_hash, expires_at, auth_epoch, mfa_authenticated_at)
       values ($1, 'mfa-proven-refresh', now() + interval '1 day', 1, now())`,
      [mfaUserId],
    );
    const disablement = await client.query(
      'select transition_user_mfa($1, false, null) as auth_epoch',
      [mfaUserId],
    );
    assert.equal(disablement.rows[0].auth_epoch, 2);
    const disabled = (await client.query(
      `select auth_epoch, mfa_enabled, mfa_secret_encrypted,
              (select count(*) from refresh_tokens where user_id = $1 and revoked_at is null) as live_refresh,
              (select count(*) from audit_log where entity_id = $1 and action like 'mfa.%') as mfa_audit_events
       from users where id = $1`,
      [mfaUserId],
    )).rows[0];
    assert.equal(disabled.auth_epoch, 2);
    assert.equal(disabled.mfa_enabled, false);
    assert.equal(disabled.mfa_secret_encrypted, null);
    assert.equal(disabled.live_refresh, '0');
    assert.equal(disabled.mfa_audit_events, '2');
    await expectSqlCode(
      client.query(
        `insert into refresh_tokens
          (user_id, token_hash, expires_at, auth_epoch)
         values ($1, 'stale-epoch-refresh', now() + interval '1 day', 1)`,
        [mfaUserId],
      ),
      'P0001',
    );

    for (const filename of migrationFiles) {
      await client.query(await fs.readFile(path.join(migrationDir, filename), 'utf8'));
    }
    const epochAdvance = await client.query(
      "select advance_user_auth_epoch($1, 'password_changed') as auth_epoch",
      [legacyUserId],
    );
    assert.equal(epochAdvance.rows[0].auth_epoch, 1);
    const revokedLegacySession = await client.query(
      `select auth_epoch,
              (select count(*) from refresh_tokens where user_id = $1 and revoked_at is null) as live_refresh
       from users where id = $1`,
      [legacyUserId],
    );
    assert.equal(revokedLegacySession.rows[0].auth_epoch, 1);
    assert.equal(revokedLegacySession.rows[0].live_refresh, '0');
    assert.equal(
      (await client.query('select count(*)::int as count from users where id = $1', [legacyUserId])).rows[0].count,
      1,
      'reapplying migrations must retain legacy rows',
    );
  } finally {
    await client.query('rollback').catch(() => {});
    await client.query(`drop schema if exists "${schema}" cascade`).catch(() => {});
    await client.end();
  }
});
