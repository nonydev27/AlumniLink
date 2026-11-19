import { tx } from '../../db.js';
import { AppError, conflict, forbidden, notFound } from '../../utils/errors.js';
import { publishNotification } from '../v2/notifications/notifications.service.js';

const NEW_STATUS = Object.freeze({ accept: 'accepted', decline: 'declined', cancel: 'cancelled' });

export async function changeConnection({
  connectionId,
  actorId,
  action,
  transaction = tx,
  publish = publishNotification,
}) {
  const nextStatus = NEW_STATUS[action];
  if (!nextStatus) throw new AppError(400, 'invalid_connection_action', 'That connection action is not supported.');

  return transaction(async (t) => {
    const connection = await t.one(
      `select id, requester_id, recipient_id, kind, status
       from connections
       where id = $1 and (requester_id = $2 or recipient_id = $2)
       for update`,
      [connectionId, actorId],
    );
    if (!connection) throw notFound('We could not find that request.');
    if (connection.status !== 'pending') throw conflict('This request has already been answered.', 'already_answered');
    const isRequester = connection.requesterId === actorId;
    if (action === 'cancel' ? !isRequester : isRequester) {
      throw forbidden(action === 'cancel'
        ? 'Only the person who sent a request can cancel it.'
        : 'Only the person who received a request can answer it.');
    }

    let mentorship = null;
    if (action === 'accept' && connection.kind === 'mentorship') {
      const mentor = await t.one(
        `select u.id from users u join profiles p on p.user_id = u.id
         where u.id = $1 and u.status = 'active' and u.verification_status = 'verified'
           and p.willing_to_mentor = true`,
        [connection.recipientId],
      );
      if (!mentor) {
        throw new AppError(409, 'mentor_unavailable', 'This person is no longer available for mentorship requests.');
      }
    }

    const updated = await t.one(
      `update connections set status = $2, responded_at = now()
       where id = $1 returning id, kind, status, responded_at`,
      [connection.id, nextStatus],
    );

    const recipientId = action === 'cancel' ? connection.recipientId : connection.requesterId;
    const people = await t.all('select id, first_name, email from users where id = any($1::uuid[])', [
      [connection.requesterId, connection.recipientId],
    ]);
    const byId = new Map(people.map((person) => [person.id, person]));
    const actorName = byId.get(actorId)?.firstName || 'Someone';
    const recipient = byId.get(recipientId);

    if (action === 'decline' || action === 'cancel') {
      const declined = action === 'decline';
      await publish(t, {
        userId: recipientId,
        type: declined ? 'connection_declined' : 'connection_cancelled',
        title: declined ? 'Request declined' : 'Request withdrawn',
        body: declined ? `${actorName} declined your request.` : `${actorName} withdrew their request.`,
        data: { connectionId: connection.id },
        dedupeKey: `connection:${connection.id}:${declined ? 'declined' : 'cancelled'}`,
        emailMessage: recipient?.email ? {
          to: recipient.email,
          subject: 'Your AlumniLink request was updated',
          text: declined
            ? `${actorName} declined your AlumniLink request.`
            : `${actorName} withdrew their AlumniLink request.`,
        } : undefined,
      });
    }

    if (action === 'accept') {
      if (connection.kind === 'mentorship') {
        mentorship = await t.one(
          `insert into mentorships (connection_id, mentor_id, mentee_id)
           values ($1, $2, $3)
           on conflict (connection_id) do nothing
           returning id, connection_id, mentor_id, mentee_id, status, started_at, paused_at, completed_at`,
          [connection.id, connection.recipientId, connection.requesterId],
        );
        if (!mentorship) {
          mentorship = await t.one(
            `select id, connection_id, mentor_id, mentee_id, status, started_at, paused_at, completed_at
             from mentorships where connection_id = $1`,
            [connection.id],
          );
        }
        await publish(t, {
          userId: connection.requesterId,
          type: 'mentorship_started',
          title: 'Mentorship started',
          body: 'Your mentorship request was accepted.',
          data: { mentorshipId: mentorship.id },
          dedupeKey: `mentorship:${mentorship.id}:started`,
          emailMessage: {
            to: byId.get(connection.requesterId)?.email,
            subject: 'Your mentorship started',
            text: `${actorName} accepted your mentorship request. Sign in to AlumniLink to say hello.`,
          },
        });
      } else {
        await publish(t, {
          userId: connection.requesterId,
          type: 'connection_accepted',
          title: 'Connection accepted',
          body: 'Your connection request was accepted.',
          data: { connectionId: connection.id },
          dedupeKey: `connection:${connection.id}:accepted`,
          emailMessage: {
            to: byId.get(connection.requesterId)?.email,
            subject: 'Your connection request was accepted',
            text: `${actorName} accepted your AlumniLink connection request.`,
          },
        });
      }
    }

    return { connection: updated, mentorship };
  });
}

