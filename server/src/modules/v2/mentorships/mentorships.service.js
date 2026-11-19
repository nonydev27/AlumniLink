import { randomUUID } from 'node:crypto';
import { db, tx } from '../../../db.js';
import { conflict, forbidden, notFound } from '../../../utils/errors.js';
import { offsetOf, paginated } from '../../../utils/http.js';
import { publishNotification } from '../notifications/notifications.service.js';

const TRANSITIONS = Object.freeze({
  active: new Set(['paused', 'completed']),
  paused: new Set(['active', 'completed']),
  completed: new Set(),
});

export function canTransitionMentorship(current, next) {
  return TRANSITIONS[current]?.has(next) ?? false;
}

const mentorshipDto = (row) => ({
  id: row.id,
  connectionId: row.connectionId,
  mentorId: row.mentorId,
  menteeId: row.menteeId,
  status: row.status,
  startedAt: row.startedAt,
  pausedAt: row.pausedAt,
  completedAt: row.completedAt,
  updatedAt: row.updatedAt,
  completedMentorshipCount: row.completedMentorshipCount,
});

export async function listMentorships(userId, query, { database = db } = {}) {
  const roleFilter = query.role === 'mentor' ? 'mentor'
    : query.role === 'mentee' ? 'mentee' : null;
  const result = await database.all(
    `select m.id, m.connection_id, m.mentor_id, m.mentee_id, m.status,
            m.started_at, m.paused_at, m.completed_at, m.updated_at,
            (select count(*) from mentorships completed
             where completed.mentor_id = m.mentor_id and completed.status = 'completed')
              as completed_mentorship_count,
            count(*) over() as total
     from mentorships m
     where (m.mentor_id = $1 or m.mentee_id = $1)
       and ($2::text is null or ($2 = 'mentor' and m.mentor_id = $1)
            or ($2 = 'mentee' and m.mentee_id = $1))
       and ($3::text is null or m.status = $3)
     order by m.updated_at desc, m.id
     limit $4 offset $5`,
    [userId, roleFilter, query.status || null, query.limit, offsetOf(query)],
  );
  return paginated(result, query, mentorshipDto);
}

export async function updateMentorship(mentorshipId, actorId, nextStatus, {
  transaction = tx,
  publish = publishNotification,
} = {}) {
  return transaction(async (t) => {
    const current = await t.one(
      `select id, connection_id, mentor_id, mentee_id, status,
              started_at, paused_at, completed_at, updated_at
       from mentorships
       where id = $1 and (mentor_id = $2 or mentee_id = $2)
       for update`,
      [mentorshipId, actorId],
    );
    if (!current) throw notFound('We could not find that mentorship.');
    if (!canTransitionMentorship(current.status, nextStatus)) {
      throw conflict('That mentorship transition is not allowed.', 'invalid_mentorship_transition');
    }

    const updated = await t.one(
      `update mentorships
       set status = $2,
           paused_at = case when $2 = 'paused' then now() else null end,
           completed_at = case when $2 = 'completed' then now() else null end
       where id = $1
       returning id, connection_id, mentor_id, mentee_id, status,
                 started_at, paused_at, completed_at, updated_at`,
      [current.id, nextStatus],
    );
    const recipientId = actorId === current.mentorId ? current.menteeId : current.mentorId;
    await publish(t, {
      userId: recipientId,
      type: 'mentorship_updated',
      title: 'Mentorship updated',
      body: `Your mentorship is now ${nextStatus}.`,
      data: { mentorshipId: current.id, status: nextStatus },
      dedupeKey: `mentorship:${current.id}:status:${randomUUID()}`,
    });

    const total = await t.one(
      `select count(*) as completed_mentorship_count
       from mentorships where mentor_id = $1 and status = 'completed'`,
      [current.mentorId],
    );
    return mentorshipDto({ ...updated, completedMentorshipCount: total.completedMentorshipCount });
  });
}

