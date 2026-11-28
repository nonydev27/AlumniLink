// Reusable SQL fragments. Table aliases: u = users, p = profiles, c = connections.

export const USER_COLS = `u.id, u.email, u.role, u.first_name, u.last_name, u.verification_status,
  u.privacy, u.featured_mentor_opt_in`;
export const SELF_COLS = 'u.status, u.verification_note, u.preferences, u.created_at';
export const PROFILE_COLS = `p.headline, p.bio, p.programme, p.graduation_year, p.batch, p.current_company,
  p.job_title, p.industry, p.location, p.skills, p.interests, p.career_goals, p.willing_to_mentor,
  p.seeking_mentorship, p.linkedin_url, p.phone, p.avatar_url, p.avatar_alt, p.banner_url, p.banner_alt`;

/** True when `a` and `b` are the two people of connection row `c`, in either direction. */
export const PAIR_MATCH = (a, b) =>
  `least(c.requester_id, c.recipient_id) = least(${a}::uuid, ${b}::uuid)
   and greatest(c.requester_id, c.recipient_id) = greatest(${a}::uuid, ${b}::uuid)`;

/** Pending or accepted connection between the viewer and `other`, as columns conn.id / conn.status / conn.requester_id. */
export const CONN_LATERAL = (viewer, other) =>
  `left join lateral (
     select c.id, c.status, c.requester_id from connections c
      where ${PAIR_MATCH(viewer, other)} and c.status in ('pending', 'accepted') limit 1
   ) conn on true`;

/** Neither person has blocked the other. */
export const NOT_BLOCKED = (me, other) =>
  `not exists (select 1 from blocks b
                where (b.blocker_id = ${me}::uuid and b.blocked_id = ${other}::uuid)
                   or (b.blocker_id = ${other}::uuid and b.blocked_id = ${me}::uuid))`;

/**
 * The single source of truth for person visibility. Use with users u / profiles p
 * joined in the caller, and add CONN_LATERAL(viewer, other) when a viewer is given.
 * Anonymous callers (viewer = null) never see network-only profiles.
 */
export const VISIBLE_PROFILE = (other = 'u.id', viewer = null, connAlias = 'conn', options = {}) => {
  const {
    admin = false,          // admin read paths bypass per-person privacy but not deactivation
    requireConnection = false,
    allowAdmin = false,     // include admin accounts in directories
  } = options;
  const parts = [
    'u.status = \'active\'',
    'u.deactivated_at is null',
    'u.verification_status = \'verified\'',
    allowAdmin ? "u.role in ('student', 'alumni', 'admin')" : "u.role in ('student', 'alumni')",
    "coalesce((u.privacy->>'discoverable')::boolean, true)",
  ];
  if (viewer) {
    parts.push(NOT_BLOCKED(viewer, other));
    if (!admin) {
      parts.push(`(
        ${other} = ${viewer}::uuid
        or coalesce((u.privacy->>'networkOnly')::boolean, false) = false
        or ${connAlias}.status = 'accepted'
      )`);
    }
    if (requireConnection) parts.push(`(${other} = ${viewer}::uuid or ${connAlias}.status = 'accepted')`);
  } else {
    parts.push("coalesce((u.privacy->>'networkOnly')::boolean, false) = false");
  }
  return parts.join('\n      and ');
};

/** Same policy as VISIBLE_PROFILE for rows already loaded in JS. */
export const profileVisibleTo = (row, viewer, connected = false, options = {}) => {
  if (!row) return false;
  const { admin = false, allowAdmin = false } = options;
  if (admin) return true;
  if (viewer && row.id === viewer.id) return true;
  if (row.status !== 'active' || row.deactivatedAt || row.verificationStatus !== 'verified') return false;
  if (!['student', 'alumni', ...(allowAdmin ? ['admin'] : [])].includes(row.role)) return false;
  if (row.privacy?.discoverable === false) return false;
  if (row.privacy?.networkOnly && !connected) return false;
  return true;
};
