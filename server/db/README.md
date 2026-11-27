# Database schema evolution

The database uses PostgreSQL and ordered SQL migrations in `db/migrations/`. The
existing `001_init.sql` is the v1 baseline and is intentionally unchanged. The
migration runner records each filename in `schema_migrations`, takes a
PostgreSQL advisory lock, and applies each migration transactionally.

## V2 migration map

| Migration | Data added |
|---|---|
| `002_identity_and_security.sql` | Institution catalog and reviewed domain mappings; v2 terms/email state and email-address claims; hashed email/MFA challenges; auth epoch and MFA-authenticated refresh provenance; closed-by-default MFA release gates and atomic MFA state transition. |
| `003_notifications_and_mentorship.sql` | Notification preferences, in-app notifications, durable provider outbox/delivery attempts, and connection-backed mentorship lifecycle. |
| `004_profiles_and_recommendations.sql` | Profile education, experience, projects/publications, career preferences, privacy visibility, handles/public-consent flags, skill endorsements, and recommendation requests/publication state. |
| `005_media_analytics_account_settings.sql` | Non-destructive deactivation state, provider-neutral confirmed media metadata, and pseudonymous profile-view/search-appearance event inputs. |

These are additive migrations: no v1 table or column is dropped or narrowed.
Legacy users get `auth_epoch = 0`, MFA disabled, and unknown email/terms/
institution state. Existing profiles, relationships, and refresh sessions retain
their prior values. No student index/reference number is modeled.

## Identity and security invariants

- Institution domains are normalized by the application to lowercase IDNA ASCII
  with no trailing dot or wildcard. The database enforces a canonical lowercase
  hostname form and global uniqueness across all domain lifecycle states.
- A mapping can be active only with evidence, an approved decision, and a
  distinct reviewer. The database also requires proposer and reviewer accounts
  to be administrators. Mapping changes are automatically audited and audit
  events are append-only. A mapping already assigned to members cannot be
  rewritten to another domain or institution; corrections use a new reviewed
  mapping and an explicit affiliation transition. Catalog write transactions
  should set the transaction-local `app.actor_id` to the authenticated
  operator for accurate audit attribution.
- One user has at most one institution association, with a foreign key to the
  exact mapping that established it. Assignment requires a verified email and
  an active, reviewed mapping whose exact domain equals the email domain. No
  existing user is assigned during migration; catalog edits do not rewrite
  affiliations.
- Current and pending email addresses are claimed in one table with a global
  unique key, preventing a pending change from colliding with another account's
  current or pending address. The trigger keeps claims aligned with `users`.
- Email-action tokens, MFA challenges, and recovery codes are persisted only as
  hashes. Email-provider work is not evidence of delivery; the outbox may only
  become `delivered` after actual provider confirmation. Common top-level
  token-like fields are rejected from outbox payloads; application code must
  also keep tokens out of nested payloads, provider errors, and logs.
- `mfa_enrollment` and `mfa_authentication` security gates are seeded disabled.
  The database refuses to enable an account until both gates are explicitly
  opened by an administrator with evidence. Application login/enrollment routes
  must read and enforce the corresponding gate; do not activate either gate
  until the complete PostgreSQL MFA release matrix passes.
- Backend MFA activation/disablement must call
  `transition_user_mfa(user_id, enabled, encrypted_secret)` inside the same
  transaction boundary as related application work. It locks the account,
  advances the auth epoch once, revokes all refresh rows, consumes pending
  challenges, clears recovery-code hashes, and writes an audit event. Direct
  MFA-state and epoch writes are blocked by a database trigger. Refresh
  creation/rotation must use the current account epoch and set
  `mfa_authenticated_at` only after factor proof. Shared request middleware
  must still compare JWT epoch against the current account epoch on every
  authenticated request.

## Other data contracts

- Profile section rows carry `private`, `connections`, or `public` visibility;
  services must also apply existing block, discoverability, deactivation, and
  field-level privacy rules. Recommendation content is public only in the
  approved state. Endorsements are unique per owner/endorser/normalized skill.
- Mentorship rows must reference an accepted `kind = 'mentorship'` connection
  for the same participants. Completed impact totals are derived from completed
  rows, not stored as user-entered counters.
- Notification outbox workers must use leases and bounded attempts. Grouping
  message notices is represented by idempotency/dedupe keys; delivery must not
  run in request-process timers or imply that unavailable providers sent mail.
- Media records become `confirmed` only with a real provider, object key,
  image MIME type, positive size, alt text, and confirmation time. Services
  must enforce the selected provider's exact allow-list and byte limit before
  confirmation. With no selected provider, routes must report unavailability
  and must not create fabricated uploads or storage totals.
- Analytics events store a 32-byte application-generated HMAC digest rather
  than a raw viewer ID, IP address, or browser fingerprint. Aggregate APIs must
  omit viewer hashes. A scheduled cleanup must delete raw event rows older than
  30 days; the schema does not claim that cleanup is automatic.
- Fit-score storage in the existing v1 suggestion table is unchanged for
  compatibility. API serializers must continue returning qualitative fit
  labels and explanations only, never raw scores or percentages.

## Migration and validation

Run migrations from `server/` with `npm run migrate` after setting
`DATABASE_URL`. Apply them through the runner so the advisory lock and
`schema_migrations` tracking are used.

The focused migration test uses an isolated schema and a disposable PostgreSQL
database:

```sh
MIGRATION_TEST_DATABASE_URL=postgresql://.../disposable_db node --test test/migrations.test.js
```

It applies the unchanged v1 baseline, seeds legacy account/profile/refresh data,
applies and reapplies all v2 migrations, and checks legacy defaults, domain
governance, MFA gates/transitions/refresh provenance, notification idempotency,
mentorship linkage, analytics uniqueness, provider-safe media state, and
prohibition of student reference columns.

The migration runner wraps each file in one transaction. The new user columns
are nullable or have constant defaults, but constraints and indexes on the
existing `users` table can scan it and acquire locks. Before production rollout,
estimate `users` size and lock tolerance; schedule accordingly if the table is
large. The migrations are forward-only and contain no destructive rollback
operations; roll back application code without dropping the additive schema.
