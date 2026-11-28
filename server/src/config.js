import 'dotenv/config';
import { z } from 'zod';

const bool = (def) => z.enum(['true', 'false']).default(def).transform((v) => v === 'true');
// Non-production falls back to clearly-labelled development keys so `npm test`
// and `npm run dev` work out of the box. Production rejects these placeholders.
const secret = (name, devValue) => (devValue
  ? z.string().min(32, `${name} must be at least 32 characters`).default(devValue)
  : z.string().min(32, `${name} must be at least 32 characters`));

const byteSize = z.coerce.number().int().min(1024).max(20 * 1024 * 1024);
const storageQuota = z.coerce.number().int().min(1024).max(10 * 1024 * 1024 * 1024);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: bool('false'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: bool('true'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
  // Separate signing domains: rotating sessions must not invalidate live email
  // links or rewrite the pseudonymous analytics key space.
  EMAIL_TOKEN_SECRET: secret('EMAIL_TOKEN_SECRET', 'dev-only-email-token-secret-change-me-0123456789'),
  ANALYTICS_HMAC_SECRET: secret('ANALYTICS_HMAC_SECRET', 'dev-only-analytics-hmac-secret-change-me-0123456789'),
  CURSOR_HMAC_SECRET: secret('CURSOR_HMAC_SECRET', 'dev-only-cursor-hmac-secret-change-me-0123456789'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  TRUST_PROXY: z.string().default('false'),
  CURRENT_TERMS_VERSION: z.string().trim().min(1).max(120).optional(),
  CURRENT_TERMS_EFFECTIVE_AT: z.string().datetime({ offset: true }).optional(),
  TERMS_URL: z.string().url().optional(),
  PRIVACY_URL: z.string().url().optional(),

  // Delivery/storage adapters. "none" is an explicit, non-sending/null adapter:
  // it never reports success and leaves email work durably queued.
  EMAIL_PROVIDER: z.enum(['none', 'console', 'http']).default('none'),
  EMAIL_API_URL: z.string().url().optional(),
  EMAIL_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().trim().min(3).max(254).default('AlumniLink <no-reply@alumnilink.test>'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  EMAIL_VERIFICATION_TTL_MINUTES: z.coerce.number().int().min(5).max(60 * 24 * 14).default(1440),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(60 * 4).default(60),
  // Zero means no message text ever leaves the API in an email or outbox payload.
  EMAIL_MESSAGE_PREVIEW_MAX_CHARS: z.coerce.number().int().min(0).max(240).default(0),
  NOTIFICATION_WORKER_POLL_MS: z.coerce.number().int().min(0).max(60000).default(15000),
  ANALYTICS_ROLLUP_INTERVAL_MS: z.coerce.number().int().min(60_000).max(7 * 24 * 60 * 60 * 1000).default(24 * 60 * 60 * 1000),
  // Analytics never blocks a read. "async" starts work after the response,
  // "none" disables event collection, "inline" is for small deployments/tests.
  ANALYTICS_EVENTS: z.enum(['none', 'async', 'inline']).default('async'),

  STORAGE_PROVIDER: z.enum(['none', 'local']).default('none'),
  STORAGE_LOCAL_DIR: z.string().trim().min(1).default('./storage/uploads'),
  MEDIA_MAX_BYTES: byteSize.default(5 * 1024 * 1024),
  MEDIA_STORAGE_QUOTA_BYTES: storageQuota.default(2 * 1024 * 1024 * 1024),
}).superRefine((value, ctx) => {
  if (value.EMAIL_PROVIDER === 'http' && (!value.EMAIL_API_URL || !value.EMAIL_API_KEY)) {
    ctx.addIssue({
      code: 'custom',
      path: ['EMAIL_API_URL'],
      message: 'EMAIL_API_URL and EMAIL_API_KEY are required when EMAIL_PROVIDER=http',
    });
  }
  const terms = [value.CURRENT_TERMS_VERSION, value.CURRENT_TERMS_EFFECTIVE_AT, value.TERMS_URL, value.PRIVACY_URL];
  if (terms.some(Boolean) && terms.some((v) => !v)) {
    ctx.addIssue({
      code: 'custom',
      path: ['CURRENT_TERMS_VERSION'],
      message: 'Configure all four terms variables (version, effective at, terms URL, privacy URL) or none of them',
    });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}
const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const signingSecrets = [
    ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
    ['EMAIL_TOKEN_SECRET', env.EMAIL_TOKEN_SECRET],
    ['ANALYTICS_HMAC_SECRET', env.ANALYTICS_HMAC_SECRET],
    ['CURSOR_HMAC_SECRET', env.CURSOR_HMAC_SECRET],
  ];
  const placeholders = signingSecrets.filter(([, value]) => /replace-with|change-me/i.test(value));
  if (placeholders.length) {
    console.error(`Placeholder secrets are not allowed in production: ${placeholders.map(([name]) => name).join(', ')}.`);
    process.exit(1);
  }
  if (new Set(signingSecrets.map(([, value]) => value)).size !== signingSecrets.length) {
    console.error(`${signingSecrets.map(([name]) => name).join(', ')} must be four different values.`);
    process.exit(1);
  }
}

const trustProxy = env.TRUST_PROXY === 'true' ? true
  : env.TRUST_PROXY === 'false' ? false
  : /^\d+$/.test(env.TRUST_PROXY) ? Number(env.TRUST_PROXY)
  : env.TRUST_PROXY;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  databaseSsl: env.DATABASE_SSL,
  databaseSslRejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
  dbPoolMax: env.DB_POOL_MAX,
  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  emailTokenSecret: env.EMAIL_TOKEN_SECRET,
  analyticsHmacSecret: env.ANALYTICS_HMAC_SECRET,
  cursorHmacSecret: env.CURSOR_HMAC_SECRET,
  accessTokenTtl: env.ACCESS_TOKEN_TTL,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  clientOrigins: env.CLIENT_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  bcryptRounds: env.BCRYPT_ROUNDS,
  trustProxy,
  terms: {
    version: env.CURRENT_TERMS_VERSION ?? null,
    effectiveAt: env.CURRENT_TERMS_EFFECTIVE_AT ?? null,
    termsUrl: env.TERMS_URL ?? null,
    privacyUrl: env.PRIVACY_URL ?? null,
  },
  emailProvider: env.EMAIL_PROVIDER,
  emailApiUrl: env.EMAIL_API_URL ?? null,
  emailApiKey: env.EMAIL_API_KEY ?? null,
  emailFrom: env.EMAIL_FROM,
  clientUrl: env.CLIENT_URL,
  emailVerificationTtlMinutes: env.EMAIL_VERIFICATION_TTL_MINUTES,
  passwordResetTtlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
  emailMessagePreviewMaxChars: env.EMAIL_MESSAGE_PREVIEW_MAX_CHARS,
  notificationWorkerPollMs: env.NOTIFICATION_WORKER_POLL_MS,
  analyticsRollupIntervalMs: env.ANALYTICS_ROLLUP_INTERVAL_MS,
  analyticsEvents: env.ANALYTICS_EVENTS,
  storageProvider: env.STORAGE_PROVIDER,
  storageLocalDir: env.STORAGE_LOCAL_DIR,
  mediaMaxBytes: env.MEDIA_MAX_BYTES,
  mediaStorageQuotaBytes: env.MEDIA_STORAGE_QUOTA_BYTES,
};
