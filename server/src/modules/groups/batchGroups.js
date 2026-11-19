import { clean } from '../../utils/text.js';

/** Makes sure the "<programme> - Class of <year>" group exists and the user belongs to it. Idempotent. */
export async function ensureBatchGroup(d, userId, programme, year) {
  const prog = clean(programme);
  if (!prog || !year) return;
  await d.run(
    `insert into groups (kind, name, programme, graduation_year) values ('batch', $1, $2, $3) on conflict do nothing`,
    [`${prog} \u2013 Class of ${year}`, prog, year],
  );
  await d.run(
    `insert into group_members (group_id, user_id)
       select g.id, $1 from groups g where lower(g.programme) = lower($2) and g.graduation_year = $3
     on conflict do nothing`,
    [userId, prog, year],
  );
}
