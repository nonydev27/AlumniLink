import rateLimit from 'express-rate-limit';

const limiter = (windowMs, limit, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: { code: 'rate_limited', message } }),
    ...extra,
  });

const MIN = 60 * 1000;

export const globalLimiter = limiter(15 * MIN, 600, 'Too many requests. Please wait a few minutes and try again.');
// Only failed logins count, so normal users are never locked out by their own successful sessions.
export const loginLimiter = limiter(15 * MIN, 20, 'Too many attempts. Please wait 15 minutes and try again.', { skipSuccessfulRequests: true });
export const registerLimiter = limiter(60 * MIN, 15, 'Too many sign-ups from this connection. Please try again later.');
export const messageLimiter = limiter(MIN, 40, 'You are sending messages very quickly. Please wait a moment.');
export const aiLimiter = limiter(MIN, 40, 'Please wait a moment before asking for more suggestions.');
