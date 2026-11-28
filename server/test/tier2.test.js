import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { VISIBLE_PROFILE, profileVisibleTo } from '../src/modules/shared/sql.js';
import { detectImageContentType } from '../src/modules/v2/account/media-storage.js';
import { dmEmailText } from '../src/modules/messages/messages.routes.js';
import { buildReportSnapshot } from '../src/modules/shared/reportSnapshot.js';
import { NOTIFICATION_TYPES } from '../src/modules/v2/notifications/notifications.service.js';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = (relative) => fs.readFile(path.join(serverDir, relative), 'utf8');

// ---------------------------------------------------------------- visibility matrix

test('profile visibility matrix honours status, verification, privacy, connections and role', () => {
  const viewer = { id: 'viewer-1', role: 'student' };
  const base = {
    id: 'person-1', role: 'alumni', status: 'active', verificationStatus: 'verified',
    privacy: { discoverable: true },
  };
  assert.equal(profileVisibleTo(null, viewer), false);
  assert.equal(profileVisibleTo(base, viewer), true);
  assert.equal(profileVisibleTo({ ...base, privacy: { discoverable: false } }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, privacy: { networkOnly: true } }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, privacy: { networkOnly: true } }, viewer, true), true);
  assert.equal(profileVisibleTo({ ...base, verificationStatus: 'pending' }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, status: 'deactivated' }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, deactivatedAt: new Date() }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, role: 'admin' }, viewer), false);
  assert.equal(profileVisibleTo({ ...base, role: 'admin' }, viewer, false, { allowAdmin: true }), true);
  assert.equal(profileVisibleTo({ ...base, privacy: { networkOnly: true } }, { id: 'person-1' }), true);
  assert.equal(profileVisibleTo(base, { id: 'admin-1', role: 'admin' }, false, { admin: true }), true);
});

test('the shared SQL fragment carries the same gates for viewers and anonymous calls', () => {
  const authed = VISIBLE_PROFILE('u.id', '$1', 'conn');
  for (const clause of [
    "u.status = 'active'", 'u.deactivated_at is null', "u.verification_status = 'verified'",
    "u.privacy->>'discoverable'", "u.privacy->>'networkOnly'", "conn.status = 'accepted'",
    'from blocks',
  ]) assert.ok(authed.includes(clause), `missing ${clause}`);

  const anonymous = VISIBLE_PROFILE('u.id');
  assert.ok(anonymous.includes("u.privacy->>'networkOnly'"));
  assert.ok(!anonymous.includes('from blocks'), 'anonymous callers have no viewer to block');
  assert.ok(!anonymous.includes("conn.status = 'accepted'"));

  const requireConnection = VISIBLE_PROFILE('u.id', '$1', 'conn', { requireConnection: true });
  assert.ok(requireConnection.includes("conn.status = 'accepted'"));
});

test('read paths reuse the shared policy instead of local visibility copies', async () => {
  for (const file of [
    'modules/directory/directory.routes.js',
    'modules/connections/connections.routes.js',
    'modules/dashboard/dashboard.routes.js',
    'modules/opportunities/opportunities.routes.js',
    'modules/ai/ai.service.js',
    'modules/v2/discovery/discovery.routes.js',
  ]) {
    assert.match(await source(`src/${file}`), /VISIBLE_PROFILE/, file);
  }
  assert.match(await source('src/modules/v2/profiles/profile.routes.js'), /profileVisibleTo/);
  assert.match(await source('src/modules/users/users.routes.js'), /profileVisibleTo/);
});

// ---------------------------------------------------------------- media

test('image type comes from magic bytes, not the browser Content-Type', () => {
  assert.equal(detectImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16])), 'image/jpeg');
  assert.equal(detectImageContentType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectImageContentType(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(detectImageContentType(Buffer.from('<script>alert(1)</script>')), null);
  assert.equal(detectImageContentType(Buffer.alloc(0)), null);
});

test('upload caps default to 5 MB per file and 2 GB per account', () => {
  if (!process.env.MEDIA_MAX_BYTES) assert.equal(config.mediaMaxBytes, 5 * 1024 * 1024);
  if (!process.env.MEDIA_STORAGE_QUOTA_BYTES) assert.equal(config.mediaStorageQuotaBytes, 2 * 1024 * 1024 * 1024);
});

// ---------------------------------------------------------------- direct messages

test('DM email text excludes message content unless previews are explicitly enabled', () => {
  if (!process.env.EMAIL_MESSAGE_PREVIEW_MAX_CHARS) {
    assert.equal(config.emailMessagePreviewMaxChars, 0);
    const secret = 'My private number is 0244000000 and I am at the airport.';
    assert.equal(dmEmailText('Ada', secret), 'Ada sent you a message. Sign in to read it.');
    assert.ok(!dmEmailText('Ada', secret, config.emailMessagePreviewMaxChars).includes('private'));
  }
  assert.match(dmEmailText('Ada', 'Private words', 7), /Preview: Private$/);
});

// ---------------------------------------------------------------- moderation

test('moderation snapshots are built server-side from the reported target', async () => {
  const statements = [];
  const database = { one: async (sql, params) => {
    statements.push({ sql, params });
    return {
      snapshot: { body: 'Original post text', status: 'visible' },
      authorId: 'author-1',
    };
  } };
  const result = await buildReportSnapshot(database, 'group_post', 'post-1');
  assert.deepEqual(result, { snapshot: { body: 'Original post text', status: 'visible' }, authorId: 'author-1' });
  assert.equal(statements[0].params[0], 'post-1');
  assert.match(statements[0].sql, /gp\.author_id/);

  const ai = await buildReportSnapshot(database, 'ai_suggestion', 'suggestion-1');
  assert.equal(ai.authorId, 'author-1');
  assert.match(statements[1].sql, /s\.reasons/);
  assert.deepEqual(await buildReportSnapshot(database, 'unknown_type', 'anything'), { snapshot: {}, authorId: null });
});

test('completion requests are a supported notification type', () => {
  assert.ok(NOTIFICATION_TYPES.includes('mentorship_completion_request'));
});

test('public endorsement reads only show skills claimed on the owner profile', async () => {
  const src = await source('src/modules/v2/profiles/profile.routes.js');
  assert.equal((src.match(/unnest\(p\.skills\) claimed/g) || []).length, 2);
  assert.match(src, /Choose a skill from the profile/);
});

// ---------------------------------------------------------------- audit + author deletion

test('author deletion and audit writes are present on content routes', async () => {
  const opportunities = await source('src/modules/opportunities/opportunities.routes.js');
  assert.match(opportunities, /status = 'deleted'/);
  assert.match(opportunities, /audit\(t, req\.user\.id, 'opportunity\.delete'/);

  const messages = await source('src/modules/messages/messages.routes.js');
  assert.match(messages, /sender_id = \$2 and status = 'visible'/);
  assert.match(messages, /audit\(t, req\.user\.id, 'message\.delete'/);

  const groups = await source('src/modules/groups/groups.routes.js');
  assert.match(groups, /status = 'deleted'/);
  assert.match(groups, /group_post\.delete/);

  const admin = await source('src/modules/admin/admin.routes.js');
  assert.match(admin, /adminRoutes\.get\('\/audit'/);
  assert.match(admin, /content_snapshot/);
  assert.match(admin, /ai_suggestion: /);

  const blocks = await source('src/modules/blocks/blocks.routes.js');
  assert.match(blocks, /status = 'completed'/);
});
