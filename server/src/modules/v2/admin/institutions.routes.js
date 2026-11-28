import { Router } from 'express';
import { domainToASCII } from 'node:url';
import { z } from 'zod';
import { db, tx } from '../../../db.js';
import { authenticate, requireRole } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validate.js';
import { AppError, conflict, notFound } from '../../../utils/errors.js';
import { asyncHandler } from '../../../utils/http.js';
import { idParam } from '../../../utils/schemas.js';
import { audit } from '../../shared/audit.js';

const institutionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  shortName: z.string().trim().min(1).max(80),
}).strict();
const domainProposalSchema = z.object({
  domain: z.string().trim().min(3).max(253),
  evidenceReference: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value)),
  evidenceSummary: z.string().trim().min(20).max(1000),
}).strict();
const reviewSchema = z.object({ decision: z.enum(['approve', 'reject']) }).strict();
const statusSchema = z.object({ status: z.enum(['active', 'suspended', 'retired']) }).strict();

function normalizeDomain(input) {
  const domain = domainToASCII(input.toLowerCase().replace(/\.$/, ''));
  if (!domain || domain.includes('*') || domain.length > 253
    || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    throw new AppError(400, 'invalid_institution_domain', 'Enter a valid institutional domain without a wildcard.');
  }
  return domain;
}

export const institutionAdminRoutes = Router();
institutionAdminRoutes.use(authenticate, requireRole('admin'));

institutionAdminRoutes.get('/', asyncHandler(async (req, res) => {
  const institutions = await db.all(
    `select i.id, i.name, i.short_name, i.status, i.created_at, i.updated_at,
            count(m.id)::int as domain_count
     from institutions i left join institution_domain_mappings m on m.institution_id = i.id
     group by i.id order by lower(i.name)`,
  );
  res.json({ data: institutions });
}));

institutionAdminRoutes.post('/', validate({ body: institutionSchema }), asyncHandler(async (req, res) => {
  try {
    const institution = await tx(async (t) => {
      const row = await t.one(
        `insert into institutions (name, short_name) values ($1, $2)
         returning id, name, short_name, status, created_at`,
        [req.valid.body.name, req.valid.body.shortName],
      );
      await audit(t, req.user.id, 'institution_created', 'institution', row.id);
      return row;
    });
    res.status(201).json({ data: institution });
  } catch (error) {
    if (error.code === '23505') throw conflict('An institution with that name or short name already exists.', 'institution_exists');
    throw error;
  }
}));

institutionAdminRoutes.get('/:id/domains', validate({ params: idParam }), asyncHandler(async (req, res) => {
  const institution = await db.one('select id from institutions where id = $1', [req.valid.params.id]);
  if (!institution) throw notFound('We could not find that institution.');
  const domains = await db.all(
    `select id, domain, status, evidence_reference, evidence_summary,
            proposed_by, proposed_at, review_decision, reviewed_by, reviewed_at
     from institution_domain_mappings where institution_id = $1
     order by created_at desc`,
    [req.valid.params.id],
  );
  res.json({ data: domains });
}));

institutionAdminRoutes.post('/:id/domains', validate({ params: idParam, body: domainProposalSchema }), asyncHandler(async (req, res) => {
  const domain = normalizeDomain(req.valid.body.domain);
  try {
    const mapping = await tx(async (t) => {
      await t.run("select set_config('app.actor_id', $1, true)", [req.user.id]);
      const row = await t.one(
        `insert into institution_domain_mappings
           (institution_id, domain, evidence_reference, evidence_summary, proposed_by)
         values ($1, $2, $3, $4, $5)
         returning id, institution_id, domain, status, evidence_reference,
                   evidence_summary, proposed_by, proposed_at, review_decision`,
        [req.valid.params.id, domain, req.valid.body.evidenceReference, req.valid.body.evidenceSummary, req.user.id],
      );
      await audit(t, req.user.id, 'institution_domain_proposed', 'institution_domain', row.id, { domain });
      return row;
    });
    res.status(201).json({ data: mapping });
  } catch (error) {
    if (error.code === '23505') throw conflict('That domain is already registered.', 'institution_domain_exists');
    if (error.code === '23503') throw notFound('We could not find that institution.');
    throw error;
  }
}));

institutionAdminRoutes.patch('/domains/:id/review', validate({ params: idParam, body: reviewSchema }), asyncHandler(async (req, res) => {
  const { decision } = req.valid.body;
  const mapping = await tx(async (t) => {
    await t.run("select set_config('app.actor_id', $1, true)", [req.user.id]);
    const current = await t.one('select id, proposed_by, status from institution_domain_mappings where id = $1 for update', [req.valid.params.id]);
    if (!current) throw notFound('We could not find that domain request.');
    if (current.proposedBy === req.user.id) {
      throw new AppError(403, 'independent_review_required', 'A different administrator must review this domain evidence.');
    }
    if (current.status !== 'pending') throw conflict('This domain request has already been reviewed.', 'domain_already_reviewed');
    const row = await t.one(
      `update institution_domain_mappings
       set review_decision = $2, reviewed_by = $3, reviewed_at = now(),
           status = case when $2 = 'approved' then 'active' else 'rejected' end
       where id = $1
       returning id, institution_id, domain, status, evidence_reference,
                 evidence_summary, proposed_by, review_decision, reviewed_by, reviewed_at`,
      [current.id, decision === 'approve' ? 'approved' : 'rejected', req.user.id],
    );
    await audit(t, req.user.id, decision === 'approve' ? 'institution_domain_approved' : 'institution_domain_rejected',
      'institution_domain', row.id, { domain: row.domain });
    return row;
  });
  res.json({ data: mapping });
}));

institutionAdminRoutes.patch('/domains/:id/status', validate({ params: idParam, body: statusSchema }), asyncHandler(async (req, res) => {
  const mapping = await tx(async (t) => {
    await t.run("select set_config('app.actor_id', $1, true)", [req.user.id]);
    const row = await t.one(
      `update institution_domain_mappings set status = $2
       where id = $1 and review_decision = 'approved'
       returning id, institution_id, domain, status, review_decision`,
      [req.valid.params.id, req.valid.body.status],
    );
    if (!row) throw notFound('We could not find an approved domain mapping.');
    await audit(t, req.user.id, `institution_domain_${req.valid.body.status}`, 'institution_domain', row.id, { domain: row.domain });
    return row;
  });
  res.json({ data: mapping });
}));
