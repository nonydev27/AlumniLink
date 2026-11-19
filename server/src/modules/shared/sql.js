// Reusable SQL fragments. Table aliases: u = users, p = profiles, c = connections.

export const USER_COLS = 'u.id, u.email, u.role, u.first_name, u.last_name, u.verification_status, u.privacy';
export const SELF_COLS = 'u.status, u.verification_note, u.preferences, u.created_at';
export const PROFILE_COLS = `p.headline, p.bio, p.programme, p.graduation_year, p.batch, p.current_company,
  p.job_title, p.industry, p.location, p.skills, p.interests, p.career_goals, p.willing_to_mentor,
  p.linkedin_url, p.phone, p.avatar_url, p.avatar_alt, p.banner_url, p.banner_alt`;

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
