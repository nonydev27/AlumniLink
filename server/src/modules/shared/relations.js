import { PAIR_MATCH } from './sql.js';

export const activeConnection = (d, a, b) =>
  d.one(
    `select c.id, c.requester_id, c.recipient_id, c.status, c.kind from connections c
      where ${PAIR_MATCH('$1', '$2')} and c.status in ('pending', 'accepted') limit 1`,
    [a, b],
  );

export const isConnected = async (d, a, b) =>
  Boolean(await d.one(
    `select 1 as ok from connections c where ${PAIR_MATCH('$1', '$2')} and c.status = 'accepted' limit 1`,
    [a, b],
  ));

export const isBlocked = async (d, a, b) =>
  Boolean(await d.one(
    `select 1 as ok from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1) limit 1`,
    [a, b],
  ));
