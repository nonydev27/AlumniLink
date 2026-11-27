import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import '../../utils/zodSetup.js';
import { asyncHandler } from '../../utils/http.js';
import * as auth from './auth.service.js';

const COMMON_PASSWORDS = new Set(['password', 'password1', '12345678', '123456789', 'qwertyui', 'iloveyou', 'alumnilink']);

const email = z.string().trim().toLowerCase().email().max(254);
const name = z.string().trim().min(1).max(60);

export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'That password is too long. Please use 72 characters or fewer.')
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'That password is too common. Please choose another one.');

const registerSchema = z
  .object({
    email,
    password: passwordRule,
    firstName: name,
    lastName: name,
    role: z.enum(['student', 'alumni']),
    programme: z.string().trim().min(2).max(120),
    graduationYear: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 8),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.role === 'alumni' && v.graduationYear > new Date().getFullYear()) {
      ctx.addIssue({ code: 'custom', path: ['graduationYear'], message: 'Alumni must have already graduated. Choose a past year.' });
    }
  });

const loginSchema = z.object({ email, password: z.string().min(1, 'Please enter your password.') });
const tokenSchema = z.object({ refreshToken: z.string().min(20).max(200) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordRule });

const meta = (req) => ({ userAgent: req.headers['user-agent'] });

export const authRoutes = Router();

authRoutes.post('/register', registerLimiter, validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await auth.register(req.valid.body, meta(req)));
}));

authRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  res.json(await auth.login(req.valid.body, meta(req)));
}));

authRoutes.post('/refresh', loginLimiter, validate({ body: tokenSchema }), asyncHandler(async (req, res) => {
  res.json(await auth.refresh(req.valid.body.refreshToken, meta(req)));
}));

authRoutes.post('/logout', validate({ body: tokenSchema }), asyncHandler(async (req, res) => {
  await auth.logout(req.valid.body.refreshToken);
  res.status(204).end();
}));

authRoutes.post('/change-password', authenticate, validate({ body: changePasswordSchema }), asyncHandler(async (req, res) => {
  res.json(await auth.changePassword(req.user.id, req.valid.body, meta(req)));
}));
