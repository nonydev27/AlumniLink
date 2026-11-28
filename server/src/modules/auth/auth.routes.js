import { Router } from 'express';
import { z } from 'zod';
import '../../utils/zodSetup.js';

const COMMON_PASSWORDS = new Set(['password', 'password1', '12345678', '123456789', 'qwertyui', 'iloveyou', 'alumnilink']);

/** Kept for the v2 password schema; the v1 auth surface itself is retired. */
export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'That password is too long. Please use 72 characters or fewer.')
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), 'That password is too common. Please choose another one.');

/**
 * /api/v1/auth deliberately does no authentication work any more. It used to
 * skip terms acceptance, email verification and handle setup; clients must use
 * /api/v2/auth. Member routes under /api/v1 still accept v2 access tokens, but
 * they now carry the same identity prerequisites as v2.
 */
export const authRoutes = Router();

authRoutes.use((req, res) => res.status(410).json({
  error: {
    code: 'v1_auth_retired',
    message: 'This sign-in API has been retired. Use /api/v2/auth instead.',
    requestId: req.id,
  },
}));
