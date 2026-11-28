import { db, tx } from '../../../db.js';
import { conflict, notFound } from '../../../utils/errors.js';
import { offsetOf, paginated } from '../../../utils/http.js';
import { NOT_BLOCKED } from '../../shared/sql.js';
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
  completionRequestedBy: row.completionRequestedBy ?? null,
  completedMentorshipCount: row.completedMentorshipCount,
});

export async function listMentorships(userId, query, { database = db } = {}) {
  const roleFilter = query.role === 'mentor' ? 'mentor'
    : query.role === 'mentee' ? 'mentee' : null;
  const result = await database.all(
    `select m.id, m.connection_id, m.mentor_id, m.mentee_id, m.status,
            m.started_at, m.paused_at, m.completed_at, m.updated_at, m.completion_requested_by,
            (select count(distinct completed.mentee_id) from mentorships completed
              join users mentor on mentor.id = completed.mentor_id and mentor.role = 'alumni'
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
      `select id, connection_id, mentor_id, mentee_id, status, completion_requested_by,
              started_at, paused_at, completed_at, updated_at
       from mentorships
       where id = $1 and (mentor_id = $2 or mentee_id = $2)
       for update`,
      [mentorshipId, actorId],
    );
    if (!current) throw notFound('We could not find that mentorship.');
    if (current.status === 'completed') {
      throw conflict('That mentorship has already ended.', 'invalid_mentorship_transition');
    }

    const counterpartId = actorId === current.mentorId ? current.menteeId : current.mentorId;
    const counterpart = await t.one(
      `select 1 as ok from users u
       where u.id = $1 and u.status = 'active' and u.deactivated_at is null
         and ${NOT_BLOCKED('$2', 'u.id')}`,
      [counterpartId, actorId],
    );
    if (!counterpart) throw notFound('We could not find that mentorship.');

    // Completion is two-sided: the first request only records intent, and only
    // the counterpart can finalise it. Pause/resume stay unilateral.
    if (nextStatus === 'completed') {
      if (!current.completionRequestedBy) {
        await t.run(
          `update mentorships set completion_requested_by = $2, updated_at = now() where id = $1`,
          [current.id, actorId],
        );
        await publish(t, {
          userId: counterpartId,
          type: 'mentorship_completion_request',
          title: 'Mentorship completion requested',
          body: 'Your mentorship partner asked to mark this mentorship complete. Confirm to finish it.',
          data: { mentorshipId: current.id },
          dedupeKey: `mentorship:${current.id}:completion-request:${current.updatedAt}`,
        });
        return mentorshipDto({ ...current, completionRequestedBy: actorId });
      }
      if (current.completionRequestedBy === actorId) {
        return mentorshipDto(current); // idempotent retry of the same request
      }
      // The counterpart has requested completion; this call confirms it.
    } else if (!canTransitionMentorship(current.status, nextStatus)) {
      throw conflict('That mentorship transition is not allowed.', 'invalid_mentorship_transition');
    }

    const updated = await t.one(
      `update mentorships
       set status = $2,
           paused_at = case when $2 = 'paused' then now() else null end,
           completed_at = case when $2 = 'completed' then now() else null end,
           completion_requested_by = null,
           updated_at = now()
       where id = $1
       returning id, connection_id, mentor_id, mentee_id, status, completion_requested_by,
                 started_at, paused_at, completed_at, updated_at`,
      [current.id, nextStatus],
    );
    await publish(t, {
      userId: counterpartId,
      type: 'mentorship_updated',
      title: 'Mentorship updated',
      body: `Your mentorship is now ${nextStatus}.`,
      data: { mentorshipId: current.id, status: nextStatus },
      dedupeKey: `mentorship:${current.id}:status:${nextStatus}:${current.updatedAt}`,
    });

    const total = await t.one(
      `select count(distinct completed.mentee_id) as completed_mentorship_count
       from mentorships completed
       join users mentor on mentor.id = completed.mentor_id and mentor.role = 'alumni'
       where completed.mentor_id = $1 and completed.status = 'completed'`,
      [current.mentorId],
    );
    return mentorshipDto({ ...updated, completedMentorshipCount: total.completedMentorshipCount });
  });
}

