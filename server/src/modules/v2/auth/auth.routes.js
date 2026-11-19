import { Router } from 'express';
import { z } from 'zod';
import { passwordRule } from '../../auth/auth.routes.js';
import { loginLimiter, registerLimiter } from '../../../middleware/rateLimit.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../utils/http.js';
import {
  forgotPasswordV2, loginV2, logoutV2, refreshV2, registerV2,
  resendVerificationV2, resetPasswordV2, verifyEmailV2,
} from './auth.service.js';

const email = z.string().trim().toLowerCase().email().max(254);
const fullName = z.string().trim().min(3).max(121).refine((value) => {
  const [first, ...rest] = value.split(/\s+/);
  const last = rest.join(' ');
  return Boolean(first && last && first.length <= 60 && last.length <= 60);
}, 'Enter a first and last name, each 60 characters or fewer.');

export const registerSchema = z.object({
  email,
  password: passwordRule,
  fullName,
  role: z.enum(['student', 'alumni']),
  programme: z.string().trim().min(2).max(120),
  graduationYear: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 8),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Accept the current terms to continue.' }) }),
}).strict().superRefine((value, ctx) => {
  if (value.role === 'alumni' && value.graduationYear > new Date().getFullYear()) {
    ctx.addIssue({
      code: 'custom',
      path: ['graduationYear'],
      message: 'Alumni must have already graduated. Choose a past year.',
    });
  }
}).transform(({ fullName: value, ...rest }) => {
  const [firstName, ...lastParts] = value.split(/\s+/);
  return { ...rest, firstName, lastName: lastParts.join(' ') };
});

const loginSchema = z.object({ email, password: z.string().min(1, 'Please enter your password.') }).strict();
const tokenSchema = z.object({ refreshToken: z.string().min(20).max(200) }).strict();
const emailSchema = z.object({ email }).strict();
const actionTokenSchema = z.object({ token: z.string().min(20).max(200) }).strict();
const resetSchema = z.object({ token: z.string().min(20).max(200), newPassword: passwordRule }).strict();
const meta = (req) => ({ userAgent: req.headers['user-agent'] });

export const v2AuthRoutes = Router();

v2AuthRoutes.post('/register', registerLimiter, validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  res.status(202).json({ data: await registerV2(req.valid.body, { meta: meta(req) }) });
}));

v2AuthRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await loginV2(req.valid.body, meta(req)) });
}));

v2AuthRoutes.post('/refresh', loginLimiter, validate({ body: tokenSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await refreshV2(req.valid.body.refreshToken, meta(req)) });
}));

v2AuthRoutes.post('/logout', validate({ body: tokenSchema }), asyncHandler(async (req, res) => {
  await logoutV2(req.valid.body.refreshToken);
  res.status(204).end();
}));

v2AuthRoutes.post('/verify-email', loginLimiter, validate({ body: actionTokenSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await verifyEmailV2(req.valid.body.token) });
}));

v2AuthRoutes.post('/resend-verification', loginLimiter, validate({ body: emailSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await resendVerificationV2(req.valid.body.email) });
}));

v2AuthRoutes.post('/forgot-password', loginLimiter, validate({ body: emailSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await forgotPasswordV2(req.valid.body.email) });
}));

v2AuthRoutes.post('/reset-password', loginLimiter, validate({ body: resetSchema }), asyncHandler(async (req, res) => {
  res.json({ data: await resetPasswordV2(req.valid.body.token, req.valid.body.newPassword) });
}));
