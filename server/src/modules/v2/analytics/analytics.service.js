import crypto from 'node:crypto';
import { config } from '../../../config.js';
import { db } from '../../../db.js';

function viewerDigest(viewerId) {
  return crypto.createHmac('sha256', config.analyticsHmacSecret)
    .update(`alumnilink-profile-analytics:${viewerId}`)
    .digest('hex');
}

export async function recordProfileView(ownerId, viewerId, database = db) {
  if (!viewerId || ownerId === viewerId) return;
  await database.run(
    `insert into profile_view_events (profile_owner_id, viewer_key_hash)
     values ($1, decode($2, 'hex'))
     on conflict (profile_owner_id, viewer_key_hash, viewed_on) do nothing`,
    [ownerId, viewerDigest(viewerId)],
  );
}

export async function recordSearchAppearances(ownerIdList, viewerId, database = db) {
  if (!viewerId || !ownerIdList.length) return;
  const owners = [...new Set(ownerIdList)].filter((id) => id !== viewerId);
  if (!owners.length) return;
  await database.run(
    `insert into profile_search_appearance_events (profile_owner_id, viewer_key_hash)
     select owner_id, decode($2, 'hex')
     from unnest($1::uuid[]) as owner_id
     on conflict (profile_owner_id, viewer_key_hash, appeared_on) do nothing`,
    [owners, viewerDigest(viewerId)],
  );
}

// Analytics must never sit on a read path: a slow insert should not delay a
// search response or fail it. Events are idempotent per viewer/day, so failures
// are logged and dropped rather than turned into a 500 for the reader.
const pending = new Set();

function logFailure(error) {
  console.error('analytics_event_failed', error?.code || error?.message || 'unknown');
}

function track(work) {
  if (config.analyticsEvents === 'none') return;
  const job = Promise.resolve().then(work).catch(logFailure).finally(() => pending.delete(job));
  pending.add(job);
}

function afterResponse(res, work) {
  const run = () => setImmediate(() => track(work));
  if (config.analyticsEvents === 'inline') { run(); return; }
  if (!res || typeof res.once !== 'function') { run(); return; }
  let scheduled = false;
  const once = () => {
    if (scheduled) return;
    scheduled = true;
    run();
  };
  res.once('finish', once);
  res.once('close', once);
}

/** Best-effort: let queued events finish before the process exits. */
export async function flushAnalyticsEvents() {
  await Promise.allSettled([...pending]);
}

export function scheduleSearchAppearances(res, ownerIdList, viewerId) {
  if (!viewerId || !ownerIdList?.length) return;
  afterResponse(res, () => recordSearchAppearances(ownerIdList, viewerId));
}

export function scheduleProfileView(res, ownerId, viewerId) {
  if (!viewerId || !ownerId || ownerId === viewerId) return;
  afterResponse(res, () => recordProfileView(ownerId, viewerId));
}
