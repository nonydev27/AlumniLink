import crypto from 'node:crypto';
import { config } from '../../../config.js';
import { db } from '../../../db.js';

function viewerDigest(viewerId) {
  return crypto.createHmac('sha256', config.jwtAccessSecret)
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
