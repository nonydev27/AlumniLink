import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAiEnabled, requireRole, requireVerified } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/http.js';
import { idParam } from '../../utils/schemas.js';
import * as ai from './ai.service.js';

const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(10).default(5) });

export const aiRoutes = Router();
// AI features are for students and alumni, need a verified account, and respect the user's "AI feedback" switch.
aiRoutes.use(authenticate, requireRole('student', 'alumni'), requireVerified, requireAiEnabled, aiLimiter);

aiRoutes.get('/mentors', validate({ query: limitQuery }), asyncHandler(async (req, res) => {
  res.json(await ai.getMentorSuggestions(req.user, req.valid.query));
}));

aiRoutes.get('/opportunities', validate({ query: limitQuery }), asyncHandler(async (req, res) => {
  res.json(await ai.getOpportunitySuggestions(req.user, req.valid.query));
}));

aiRoutes.get('/profile-feedback', asyncHandler(async (req, res) => {
  res.json(await ai.getProfileFeedback(req.user));
}));

// "Why this match?" on demand, short or detailed.
aiRoutes.get('/suggestions/:id/explanation',
  validate({ params: idParam, query: z.object({ level: z.enum(['short', 'detailed']).default('detailed') }) }),
  asyncHandler(async (req, res) => {
    res.json(await ai.explainSuggestion(req.user.id, req.valid.params.id, req.valid.query.level));
  }));

// Accept or dismiss. Dismissed suggestions do not come back.
aiRoutes.patch('/suggestions/:id', validate({ params: idParam, body: z.object({ action: z.enum(['accept', 'dismiss']) }) }), asyncHandler(async (req, res) => {
  res.json({ suggestion: await ai.respondToSuggestion(req.user.id, req.valid.params.id, req.valid.body.action) });
}));

// "Was this helpful?"
aiRoutes.post('/suggestions/:id/feedback',
  validate({ params: idParam, body: z.object({ helpful: z.boolean(), comment: z.string().trim().max(1000).optional() }) }),
  asyncHandler(async (req, res) => {
    res.json({ suggestion: await ai.rateSuggestion(req.user.id, req.valid.params.id, req.valid.body) });
  }));

// "Report a bad match" goes to the administrators' queue.
aiRoutes.post('/suggestions/:id/report',
  validate({ params: idParam, body: z.object({ reason: z.enum(['bad_match', 'inappropriate', 'other']).default('bad_match'), details: z.string().trim().max(2000).optional() }) }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ report: await ai.reportSuggestion(req.user.id, req.valid.params.id, req.valid.body) });
  }));

aiRoutes.post('/message-coach',
  validate({ body: z.object({ recipientId: z.string().uuid(), draft: z.string().max(4000).optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await ai.coach(req.user, req.valid.body));
  }));

aiRoutes.get('/conversations/:id/follow-ups', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await ai.followUps(req.user, req.valid.params.id));
}));
