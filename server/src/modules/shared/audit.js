/** Records who did what. Used for every administrator action. */
export const audit = (d, actorId, action, entity, entityId, meta = {}) =>
  d.run(
    'insert into audit_log (actor_id, action, entity, entity_id, meta) values ($1, $2, $3, $4, $5::jsonb)',
    [actorId, action, entity, entityId, JSON.stringify(meta)],
  );
