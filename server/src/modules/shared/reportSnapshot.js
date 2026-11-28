// A moderator must be able to see what was reported even after the author
// deletes or hides it. Snapshots are captured server-side at report time;
// reporter-supplied details are never treated as evidence.

const SNAPSHOT_SQL = Object.freeze({
  user: `
    select jsonb_build_object(
             'firstName', u.first_name, 'lastName', u.last_name,
             'headline', p.headline, 'bio', left(p.bio, 2000), 'avatarUrl', p.avatar_url
           ) as snapshot,
           u.id as author_id
      from users u join profiles p on p.user_id = u.id where u.id = $1`,
  message: `
    select jsonb_build_object('body', left(m.body, 2000), 'senderId', m.sender_id, 'status', m.status) as snapshot,
           m.sender_id as author_id
      from messages m where m.id = $1`,
  opportunity: `
    select jsonb_build_object('title', o.title, 'description', left(o.description, 2000),
                              'company', o.company, 'status', o.status) as snapshot,
           o.posted_by as author_id
      from opportunities o where o.id = $1`,
  group_post: `
    select jsonb_build_object('body', left(gp.body, 2000), 'status', gp.status) as snapshot,
           gp.author_id as author_id
      from group_posts gp where gp.id = $1`,
  ai_suggestion: `
    select jsonb_build_object('kind', s.kind, 'reasons', s.reasons, 'score', s.score,
                              'subjectUserId', s.subject_user_id,
                              'subjectOpportunityId', s.subject_opportunity_id,
                              'status', s.status) as snapshot,
           s.user_id as author_id
      from ai_suggestions s where s.id = $1`,
});

/** Returns { snapshot, authorId }. Missing targets produce an empty snapshot. */
export async function buildReportSnapshot(database, targetType, targetId) {
  const sql = SNAPSHOT_SQL[targetType];
  if (!sql) return { snapshot: {}, authorId: null };
  const row = await database.one(sql, [targetId]);
  return {
    snapshot: row?.snapshot || {},
    authorId: row?.authorId || null,
  };
}
