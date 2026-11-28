import { createHash } from 'node:crypto';
import rateLimit from 'express-rate-limit';

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Auth abuse must be counted even when the request eventually succeeds or
    // returns a deliberately neutral 200 (forgot password / resend verification).
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message } }),
    ...extra,
  });

const MIN = 60 * 1000;
const ipKey = (req) => `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
const identityKey = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (email) return `email:${email}`;
  const token = typeof req.body?.token === 'string' ? req.body.token
    : typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
  if (token) return `token:${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
  return ipKey(req);
};

/** Two independent counters: one for the submitted identity, one for the source IP. */
const abuseLimiters = (windowMs, perIdentity, perIp, message) => [
  limiter(windowMs, perIdentity, message, { keyGenerator: identityKey }),
  limiter(windowMs, perIp, message, { keyGenerator: ipKey }),
];

export const globalLimiter = limiter(15 * MIN, 600, 'Too many requests. Please wait a few minutes and try again.');
export const loginLimiter = abuseLimiters(
  15 * MIN, 8, 60,
  'Too many sign-in attempts. Please wait 15 minutes and try again.',
);
export const registerLimiter = abuseLimiters(
  60 * MIN, 5, 20,
  'Too many sign-ups from this connection. Please try again later.',
);
// Neutral responses still consume a slot; otherwise email enumeration by
// repeated polling would be free.
export const authActionLimiter = abuseLimiters(
  15 * MIN, 8, 60,
  'Too many requests. Please wait 15 minutes and try again.',
);
export const messageLimiter = limiter(MIN, 40, 'You are sending messages very quickly. Please wait a moment.');
export const aiLimiter = limiter(MIN, 40, 'Please wait a moment before asking for more suggestions.');
