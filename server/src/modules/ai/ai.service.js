import { db, tx } from '../../db.js';
import { AppError, conflict, notFound } from '../../utils/errors.js';
import { loadProfileRow } from '../me/me.service.js';
import { toOpportunity, toPublicProfile } from '../shared/serializers.js';
import { NOT_BLOCKED, PAIR_MATCH, PROFILE_COLS, USER_COLS } from '../shared/sql.js';
import { coachMessage } from './coach.js';
import { AI_LABEL, AI_NOTE, DATA_USED_OPPORTUNITIES, FIT, explain } from './explain.js';
import { suggestFollowUps } from './followups.js';
import { hasEnoughForMatching, missingForMatching, rankMentors, sharedPhrases } from './matching.js';
import { profileFeedback } from './profileTips.js';
import { hasEnoughForOpportunities, missingForOpportunities, rankOpportunities } from './recommend.js';

const aiMeta = () => ({ label: AI_LABEL, note: AI_NOTE });
const levelOf = (user) => user.preferences?.explanationLevel || 'short';

// ----------------------------------------------------------------- mentor matches
// Candidates are pre-filtered in SQL for safety (verified, willing, visible, not blocked, not already
// connected, not dismissed) and scored in JS. Capped at 300 - see README "Scaling" for the next step.
const MENTOR_CANDIDATES_SQL = `
  select ${USER_COLS}, ${PROFILE_COLS},
         (select count(*) from connections c where c.recipient_id = u.id and c.status = 'pending' and c.kind = 'mentorship') as pending_requests
    from users u join profiles p on p.user_id = u.id
   where u.role = 'alumni' and u.status = 'active' and u.verification_status = 'verified'
     and p.willing_to_mentor
     and coalesce((u.privacy->>'discoverable')::boolean, true)
     and u.id <> $1
     and ${NOT_BLOCKED('$1', 'u.id')}
     and not exists (select 1 from connections c where ${PAIR_MATCH('$1', 'u.id')} and c.status in ('pending', 'accepted'))
     and not exists (select 1 from ai_suggestions s
                      where s.user_id = $1 and s.kind = 'mentor_match' and s.subject_user_id = u.id
                        and s.status in ('dismissed', 'accepted'))
   order by p.updated_at desc
   limit 300`;

const UPSERT_MENTOR = `
  insert into ai_suggestions (user_id, kind, subject_user_id, score, confidence, reasons)
  values ($1, 'mentor_match', $2, $3, $4, $5::jsonb)
  on conflict (user_id, subject_user_id) where kind = 'mentor_match'
  do update set score = excluded.score, confidence = excluded.confidence, reasons = excluded.reasons
  returning id`;

export async function getMentorSuggestions(user, { limit }) {
  const me = await loadProfileRow(user.id);
  const base = { ai: aiMeta() };

  if (!hasEnoughForMatching(me)) {
    return {
      ...base, status: 'needs_more_details', suggestions: [], missing: missingForMatching(me),
      message: 'We need more details to suggest mentors. Add your interests or career goals to your profile.',
    };
  }

  const ranked = rankMentors(me, await db.all(MENTOR_CANDIDATES_SQL, [user.id]), { limit });
  if (!ranked.length) {
    return {
      ...base, status: 'no_matches', suggestions: [],
      message: "We couldn't find a strong match yet. Try adding more interests or skills, or browse the alumni directory.",
    };
  }

  const ids = await tx(async (t) => {
    const out = [];
    for (const r of ranked) {
      out.push((await t.one(UPSERT_MENTOR, [user.id, r.mentor.id, r.score, r.confidence, JSON.stringify(r.reasons)])).id);
    }
    return out;
  });

  const level = levelOf(user);
  return {
    ...base,
    status: 'ok',
    suggestions: ranked.map((r, i) => {
      const name = `${r.mentor.firstName} ${r.mentor.lastName}`;
      return {
        id: ids[i],
        kind: 'mentor_match',
        label: AI_LABEL,
        headline: `${name} may be a good mentor for you.`,
        fit: { level: r.confidence, label: FIT[r.confidence] }, // wording shows uncertainty; no false precision
        explanation: explain(r.reasons, { level, intro: `${name} may be a good mentor for you. Why this match?` }),
        mentor: toPublicProfile(r.mentor, { viewer: user }),
        status: 'shown',
        actions: ['request_mentorship', 'dismiss', 'why_this_match'],
      };
    }),
  };
}

// ----------------------------------------------------------------- opportunity alerts
const OPPORTUNITY_CANDIDATES_SQL = `
  select o.id, o.type, o.title, o.description, o.company, o.location, o.industry, o.is_remote, o.apply_url,
         o.event_date, o.deadline, o.tags, o.status, o.created_at, o.posted_by,
         u.first_name as poster_first_name, u.last_name as poster_last_name, pp.programme as poster_programme
    from opportunities o join users u on u.id = o.posted_by join profiles pp on pp.user_id = u.id
   where o.status = 'active' and u.status = 'active' and o.posted_by <> $1
     and (o.deadline is null or o.deadline >= now())
     and (o.event_date is null or o.event_date >= now())
     and ${NOT_BLOCKED('$1', 'o.posted_by')}
     and not exists (select 1 from ai_suggestions s
                      where s.user_id = $1 and s.kind = 'opportunity' and s.subject_opportunity_id = o.id and s.status = 'dismissed')
   order by o.created_at desc
   limit 200`;

const UPSERT_OPPORTUNITY = `
  insert into ai_suggestions (user_id, kind, subject_opportunity_id, score, confidence, reasons)
  values ($1, 'opportunity', $2, $3, $4, $5::jsonb)
  on conflict (user_id, subject_opportunity_id) where kind = 'opportunity'
  do update set score = excluded.score, confidence = excluded.confidence, reasons = excluded.reasons
  returning id`;

export async function getOpportunitySuggestions(user, { limit }) {
  const me = await loadProfileRow(user.id);
  const base = { ai: aiMeta() };

  if (!hasEnoughForOpportunities(me)) {
    return {
      ...base, status: 'needs_more_details', suggestions: [], missing: missingForOpportunities(me),
      message: 'We need more details to suggest opportunities. Add your interests, career goals or skills to your profile.',
    };
  }
  const ranked = rankOpportunities(me, await db.all(OPPORTUNITY_CANDIDATES_SQL, [user.id]), { limit });
  if (!ranked.length) {
    return { ...base, status: 'no_matches', suggestions: [], message: 'Nothing matches your profile right now. You can still browse all opportunities.' };
  }

  const ids = await tx(async (t) => {
    const out = [];
    for (const r of ranked) {
      out.push((await t.one(UPSERT_OPPORTUNITY, [user.id, r.opportunity.id, r.score, r.confidence, JSON.stringify(r.reasons)])).id);
    }
    return out;
  });

  const level = levelOf(user);
  return {
    ...base,
    status: 'ok',
    suggestions: ranked.map((r, i) => ({
      id: ids[i],
      kind: 'opportunity',
      label: AI_LABEL,
      headline: `"${r.opportunity.title}" may be worth a look.`,
      fit: { level: r.confidence, label: FIT[r.confidence] },
      explanation: explain(r.reasons, {
        level, dataUsed: DATA_USED_OPPORTUNITIES, intro: `"${r.opportunity.title}" may be worth a look. Why this suggestion?`,
      }),
      opportunity: toOpportunity(r.opportunity),
      status: 'shown',
      actions: ['save', 'dismiss', 'why_this_suggestion'],
    })),
  };
}

// ----------------------------------------------------------------- user control over suggestions
export async function respondToSuggestion(userId, id, action) {
  const status = action === 'accept' ? 'accepted' : 'dismissed';
  const row = await db.one(
    `update ai_suggestions set status = $3, responded_at = now()
      where id = $1 and user_id = $2 and status = 'shown' returning id, status`,
    [id, userId, status],
  );
  if (row) return row;
  if (await db.one('select 1 as ok from ai_suggestions where id = $1 and user_id = $2', [id, userId])) {
    throw conflict('You have already answered this suggestion.', 'already_answered');
  }
  throw notFound('We could not find that suggestion.');
}

export async function rateSuggestion(userId, id, { helpful, comment }) {
  const row = await db.one(
    'update ai_suggestions set helpful = $3, feedback_comment = $4 where id = $1 and user_id = $2 returning id, helpful',
    [id, userId, helpful, comment || null],
  );
  if (!row) throw notFound('We could not find that suggestion.');
  return row;
}

export async function reportSuggestion(userId, id, { reason, details }) {
  const s = await db.one('select id from ai_suggestions where id = $1 and user_id = $2', [id, userId]);
  if (!s) throw notFound('We could not find that suggestion.');
  return db.one(
    `insert into reports (reporter_id, target_type, target_id, reason, details)
     values ($1, 'ai_suggestion', $2, $3, $4) returning id, status, created_at`,
    [userId, id, reason, details || null],
  );
}

export async function explainSuggestion(userId, id, level) {
  const s = await db.one(
    `select s.id, s.kind, s.reasons, u.first_name, u.last_name, o.title
       from ai_suggestions s
       left join users u on u.id = s.subject_user_id
       left join opportunities o on o.id = s.subject_opportunity_id
      where s.id = $1 and s.user_id = $2`,
    [id, userId],
  );
  if (!s) throw notFound('We could not find that suggestion.');
  const mentor = s.kind === 'mentor_match';
  return {
    id: s.id,
    label: AI_LABEL,
    explanation: explain(s.reasons, {
      level,
      dataUsed: mentor ? undefined : DATA_USED_OPPORTUNITIES,
      intro: mentor
        ? `${s.firstName} ${s.lastName} may be a good mentor for you. Why this match?`
        : `"${s.title}" may be worth a look. Why this suggestion?`,
    }),
  };
}

// ----------------------------------------------------------------- tips, coaching, follow-ups
export async function getProfileFeedback(user) {
  return profileFeedback(await loadProfileRow(user.id));
}

async function loadVisiblePerson(viewer, otherId) {
  const row = await db.one(
    `select ${USER_COLS}, ${PROFILE_COLS} from users u join profiles p on p.user_id = u.id
      where u.id = $1 and u.status = 'active' and u.verification_status = 'verified' and u.role <> 'admin'
        and ${NOT_BLOCKED('$2', 'u.id')}`,
    [otherId, viewer.id],
  );
  if (!row) throw notFound("We couldn't find this person.");
  return row;
}

export async function coach(user, { recipientId, draft }) {
  if (recipientId === user.id) throw new AppError(400, 'bad_request', "You can't write a message to yourself.");
  const me = await loadProfileRow(user.id);
  const row = await loadVisiblePerson(user, recipientId);
  // Only use what the other person has made public (e.g. employer hidden if they chose so).
  const mentor = toPublicProfile(row, { viewer: user });
  return coachMessage({ student: me, mentor, sharedInterests: sharedPhrases(me.interests, mentor.interests), draft });
}

export async function followUps(user, conversationId) {
  const c = await db.one(
    'select id, user_a, user_b from conversations where id = $1 and (user_a = $2 or user_b = $2)',
    [conversationId, user.id],
  );
  if (!c) throw notFound('We could not find that conversation.');
  const otherId = c.userA === user.id ? c.userB : c.userA;
  const me = await loadProfileRow(user.id);
  const other = toPublicProfile(await loadVisiblePerson(user, otherId), { viewer: user, connected: true });
  return suggestFollowUps({ other, sharedInterests: sharedPhrases(me.interests, other.interests) });
}
