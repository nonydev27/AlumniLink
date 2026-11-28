import { db } from '../../db.js';

/**
 * Institution identity is derived only from an admin-proposed, independently
 * reviewed, active email domain. Student index/reference numbers are never
 * collected or stored.
 */
export function emailDomain(email) {
  return String(email || '').trim().toLowerCase().split('@')[1] || '';
}

export async function findActiveInstitutionMapping(database, email) {
  const domain = emailDomain(email);
  if (!domain) return null;
  return database.one(
    `select m.id as mapping_id, m.institution_id, m.domain, i.name as institution_name, i.short_name
     from institution_domain_mappings m
     join institutions i on i.id = m.institution_id
     where m.domain = $1 and m.status = 'active' and m.review_decision = 'approved'
       and m.reviewed_by is not null and m.reviewed_by <> m.proposed_by
       and i.status = 'active'`,
    [domain],
  );
}

/** Assigns a verified account to its institution. The DB guard re-checks every condition. */
export async function assignInstitutionToVerifiedEmail(database, userId, email) {
  const mapping = await findActiveInstitutionMapping(database, email);
  if (!mapping) return null;
  await database.run(
    `update users set institution_id = $2, institution_domain_mapping_id = $3
     where id = $1 and institution_id is null`,
    [userId, mapping.institutionId, mapping.mappingId],
  );
  return mapping;
}

/**
 * Students are network-verified only when their email is verified and their
 * domain is approved. Alumni remain pending until the Alumni Relations review.
 */
export async function finalizeStudentIdentity(database, userId, email) {
  const user = await database.one('select role from users where id = $1', [userId]);
  if (!user || !['student', 'alumni'].includes(user.role)) return null;
  const mapping = await assignInstitutionToVerifiedEmail(database, userId, email);
  if (user.role !== 'student' || !mapping) return { mapping, verified: false };
  await database.run(
    `update users set verification_status = 'verified', verified_at = coalesce(verified_at, now())
     where id = $1 and verification_status = 'pending'`,
    [userId],
  );
  return { mapping, verified: true };
}

export const findActiveInstitutionMappingForEmail = (email, database = db) =>
  findActiveInstitutionMapping(database, email);
