-- Additive v2 identity/security schema. Existing v1 accounts remain unverified,
-- institution-unresolved, MFA-disabled, and at auth epoch zero.

create table if not exists institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 200),
  short_name   text not null check (char_length(short_name) between 1 and 80),
  status       text not null default 'active' check (status in ('active', 'suspended', 'retired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists institutions_name_key on institutions (lower(name));
create unique index if not exists institutions_short_name_key on institutions (lower(short_name));
drop trigger if exists institutions_updated on institutions;
create trigger institutions_updated before update on institutions
for each row execute function set_updated_at();

create table if not exists institution_domain_mappings (
  id                    uuid primary key default gen_random_uuid(),
  institution_id        uuid not null references institutions(id) on delete restrict,
  domain                text not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'active', 'rejected', 'suspended', 'retired')),
  evidence_reference    text,
  evidence_summary      text,
  proposed_by           uuid not null references users(id) on delete restrict,
  proposed_at           timestamptz not null default now(),
  review_decision       text not null default 'pending'
                          check (review_decision in ('pending', 'approved', 'rejected')),
  reviewed_by           uuid references users(id) on delete restrict,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (domain),
  unique (institution_id, id),
  check (char_length(domain) between 3 and 253),
  check (
    domain = lower(domain)
    and right(domain, 1) <> '.'
    and position('*' in domain) = 0
    and domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  check (reviewed_by is null or reviewed_by <> proposed_by),
  check (
    status <> 'active'
    or (
      evidence_reference is not null
      and char_length(btrim(evidence_reference)) > 0
      and evidence_summary is not null
      and char_length(btrim(evidence_summary)) > 0
      and review_decision = 'approved'
      and reviewed_by is not null
      and reviewed_at is not null
      and reviewed_by <> proposed_by
    )
  )
);
create index if not exists institution_domain_mappings_institution_idx
  on institution_domain_mappings (institution_id, status);
create index if not exists institution_domain_mappings_assignment_idx
  on institution_domain_mappings (domain)
  where status = 'active' and review_decision = 'approved';
drop trigger if exists institution_domain_mappings_updated on institution_domain_mappings;
create trigger institution_domain_mappings_updated before update on institution_domain_mappings
for each row execute function set_updated_at();

create or replace function validate_institution_domain_mapping_governance()
returns trigger as $$
declare
  proposer_role text;
  reviewer_role text;
begin
  select role into proposer_role from users where id = new.proposed_by;
  if proposer_role is distinct from 'admin' then
    raise exception 'institution domain mappings must be proposed by an administrator';
  end if;
  if new.reviewed_by is not null then
    select role into reviewer_role from users where id = new.reviewed_by;
    if reviewer_role is distinct from 'admin' or new.reviewed_by = new.proposed_by then
      raise exception 'institution domain mappings require an independent administrator reviewer';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists institution_domain_mappings_governance_guard on institution_domain_mappings;
create trigger institution_domain_mappings_governance_guard
  before insert or update of proposed_by, reviewed_by, status, review_decision
  on institution_domain_mappings
  for each row execute function validate_institution_domain_mapping_governance();

create table if not exists institution_domain_audit (
  id                  bigint generated always as identity primary key,
  mapping_id          uuid not null references institution_domain_mappings(id) on delete restrict,
  actor_id            uuid references users(id) on delete set null,
  action              text not null,
  previous_state      jsonb,
  resulting_state     jsonb not null,
  evidence_reference  text,
  created_at          timestamptz not null default now()
);
create index if not exists institution_domain_audit_mapping_idx
  on institution_domain_audit (mapping_id, created_at desc);

create or replace function prevent_institution_domain_audit_mutation()
returns trigger as $$
begin
  raise exception 'institution domain audit records are append-only';
end;
$$ language plpgsql;
drop trigger if exists institution_domain_audit_immutable on institution_domain_audit;
create trigger institution_domain_audit_immutable
  before update or delete on institution_domain_audit
  for each row execute function prevent_institution_domain_audit_mutation();

create or replace function prevent_assigned_domain_mapping_rewrite()
returns trigger as $$
begin
  if (old.institution_id is distinct from new.institution_id or old.domain is distinct from new.domain)
    and exists (
      select 1 from users
      where institution_domain_mapping_id = old.id
    ) then
    raise exception 'an assigned institution domain mapping cannot be rewritten; use a reviewed affiliation transition';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists institution_domain_mapping_assignment_guard on institution_domain_mappings;
create trigger institution_domain_mapping_assignment_guard
  before update of institution_id, domain on institution_domain_mappings
  for each row execute function prevent_assigned_domain_mapping_rewrite();

create or replace function audit_institution_domain_mapping_change()
returns trigger as $$
declare
  actor_setting text;
  audit_actor uuid;
begin
  actor_setting := nullif(current_setting('app.actor_id', true), '');
  if actor_setting is not null then
    audit_actor := actor_setting::uuid;
  else
    audit_actor := coalesce(new.reviewed_by, new.proposed_by);
  end if;
  insert into institution_domain_audit
    (mapping_id, actor_id, action, previous_state, resulting_state, evidence_reference)
  values (
    new.id,
    audit_actor,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'INSERT' then null else
      jsonb_build_object(
        'institutionId', old.institution_id,
        'domain', old.domain,
        'status', old.status,
        'reviewDecision', old.review_decision,
        'reviewedBy', old.reviewed_by
      )
    end,
    jsonb_build_object(
      'institutionId', new.institution_id,
      'domain', new.domain,
      'status', new.status,
      'reviewDecision', new.review_decision,
      'reviewedBy', new.reviewed_by
    ),
    new.evidence_reference
  );
  return new;
end;
$$ language plpgsql;
drop trigger if exists institution_domain_mapping_audit_log on institution_domain_mappings;
create trigger institution_domain_mapping_audit_log
  after insert or update on institution_domain_mappings
  for each row execute function audit_institution_domain_mapping_change();

alter table users
  add column if not exists auth_epoch integer not null default 0,
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists mfa_secret_encrypted text,
  add column if not exists mfa_pending_secret_encrypted text,
  add column if not exists mfa_enrolled_at timestamptz,
  add column if not exists email_verified_at timestamptz,
  add column if not exists terms_accepted_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists institution_id uuid,
  add column if not exists institution_domain_mapping_id uuid,
  add column if not exists pending_email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_auth_epoch_nonnegative') then
    alter table users add constraint users_auth_epoch_nonnegative check (auth_epoch >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_mfa_state_consistent') then
    alter table users add constraint users_mfa_state_consistent check (
      (mfa_enabled and mfa_secret_encrypted is not null and mfa_enrolled_at is not null)
      or
      (not mfa_enabled and mfa_secret_encrypted is null and mfa_enrolled_at is null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_terms_state_consistent') then
    alter table users add constraint users_terms_state_consistent check (
      (terms_accepted_version is null and terms_accepted_at is null)
      or
      (terms_accepted_version is not null and char_length(btrim(terms_accepted_version)) > 0 and terms_accepted_at is not null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_institution_assignment_pair') then
    alter table users add constraint users_institution_assignment_pair check (
      (institution_id is null and institution_domain_mapping_id is null)
      or
      (institution_id is not null and institution_domain_mapping_id is not null and email_verified_at is not null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_institution_mapping_fkey') then
    alter table users add constraint users_institution_mapping_fkey
      foreign key (institution_id, institution_domain_mapping_id)
      references institution_domain_mappings (institution_id, id)
      on delete restrict;
  end if;
end
$$;
create index if not exists users_institution_idx on users (institution_id) where institution_id is not null;
create unique index if not exists users_pending_email_key on users (lower(pending_email)) where pending_email is not null;

-- A single claim registry prevents races between another account's current
-- address and a pending address-change request.
create table if not exists email_address_claims (
  email_address   text primary key,
  user_id         uuid not null references users(id) on delete cascade,
  purpose         text not null check (purpose in ('current', 'pending')),
  created_at      timestamptz not null default now(),
  check (email_address = lower(email_address)),
  check (char_length(btrim(email_address)) between 3 and 320)
);
create unique index if not exists email_address_claims_user_current_key
  on email_address_claims (user_id)
  where purpose = 'current';
create unique index if not exists email_address_claims_user_pending_key
  on email_address_claims (user_id)
  where purpose = 'pending';
insert into email_address_claims (email_address, user_id, purpose)
select lower(email), id, 'current' from users
on conflict (email_address) do nothing;
insert into email_address_claims (email_address, user_id, purpose)
select lower(pending_email), id, 'pending' from users where pending_email is not null
on conflict (email_address) do nothing;

create or replace function sync_user_email_claims()
returns trigger as $$
begin
  delete from email_address_claims where user_id = new.id;
  insert into email_address_claims (email_address, user_id, purpose)
  values (lower(new.email), new.id, 'current');
  if new.pending_email is not null then
    insert into email_address_claims (email_address, user_id, purpose)
    values (lower(new.pending_email), new.id, 'pending');
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists users_email_claims_sync on users;
create trigger users_email_claims_sync
  after insert or update of email, pending_email on users
  for each row execute function sync_user_email_claims();

alter table refresh_tokens
  add column if not exists auth_epoch integer not null default 0,
  add column if not exists mfa_authenticated_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'refresh_tokens_auth_epoch_nonnegative') then
    alter table refresh_tokens add constraint refresh_tokens_auth_epoch_nonnegative check (auth_epoch >= 0);
  end if;
end
$$;
create index if not exists refresh_tokens_epoch_idx on refresh_tokens (user_id, auth_epoch, revoked_at);

create table if not exists user_terms_acceptances (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  terms_version   text not null check (char_length(btrim(terms_version)) between 1 and 120),
  accepted_at     timestamptz not null default now(),
  unique (user_id, terms_version)
);
create index if not exists user_terms_acceptances_user_idx
  on user_terms_acceptances (user_id, accepted_at desc);

create table if not exists email_action_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  purpose         text not null check (purpose in ('verify_email', 'password_reset', 'change_email')),
  email_address   text not null,
  token_hash      text not null unique,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  invalidated_at  timestamptz,
  check (expires_at > created_at),
  check (consumed_at is null or invalidated_at is null)
);
create index if not exists email_action_tokens_live_idx
  on email_action_tokens (user_id, purpose, expires_at desc)
  where consumed_at is null and invalidated_at is null;
create index if not exists email_action_tokens_expiry_idx on email_action_tokens (expires_at);
create unique index if not exists email_action_tokens_one_live_per_address
  on email_action_tokens (user_id, purpose, lower(email_address))
  where consumed_at is null and invalidated_at is null;

create table if not exists mfa_login_challenges (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  challenge_hash    text not null unique,
  auth_epoch        integer not null check (auth_epoch >= 0),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  consumed_at       timestamptz,
  failed_attempts   integer not null default 0 check (failed_attempts between 0 and 10),
  check (expires_at > created_at)
);
create index if not exists mfa_login_challenges_live_idx
  on mfa_login_challenges (user_id, expires_at desc)
  where consumed_at is null;
create unique index if not exists mfa_login_challenges_one_open_per_user
  on mfa_login_challenges (user_id)
  where consumed_at is null;

create table if not exists mfa_recovery_codes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  code_hash       text not null unique,
  created_at      timestamptz not null default now(),
  consumed_at     timestamptz
);
create index if not exists mfa_recovery_codes_unused_idx
  on mfa_recovery_codes (user_id, created_at)
  where consumed_at is null;

-- Both switches start closed. Enrollment and factor login are not available
-- until the MFA epoch/refresh release gate has been proven on PostgreSQL.
create table if not exists security_feature_gates (
  gate_name          text primary key check (gate_name in ('mfa_enrollment', 'mfa_authentication')),
  enabled            boolean not null default false,
  enabled_at         timestamptz,
  enabled_by         uuid references users(id) on delete restrict,
  evidence_reference text,
  updated_at         timestamptz not null default now(),
  check (
    (not enabled and enabled_at is null and enabled_by is null and evidence_reference is null)
    or
    (enabled and enabled_at is not null and enabled_by is not null
      and evidence_reference is not null and char_length(btrim(evidence_reference)) > 0)
  )
);
insert into security_feature_gates (gate_name, enabled)
values ('mfa_enrollment', false), ('mfa_authentication', false)
on conflict (gate_name) do nothing;

create table if not exists security_feature_gate_audit (
  id                  bigint generated always as identity primary key,
  gate_name           text not null,
  old_enabled         boolean,
  new_enabled         boolean not null,
  actor_id            uuid,
  evidence_reference  text,
  created_at          timestamptz not null default now()
);
create index if not exists security_feature_gate_audit_name_idx
  on security_feature_gate_audit (gate_name, created_at desc);

create or replace function prevent_security_gate_audit_mutation()
returns trigger as $$
begin
  raise exception 'security feature gate audit records are append-only';
end;
$$ language plpgsql;
drop trigger if exists security_feature_gate_audit_immutable on security_feature_gate_audit;
create trigger security_feature_gate_audit_immutable
  before update or delete on security_feature_gate_audit
  for each row execute function prevent_security_gate_audit_mutation();

create or replace function record_security_feature_gate_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' or old.enabled is distinct from new.enabled
    or old.evidence_reference is distinct from new.evidence_reference
    or old.enabled_by is distinct from new.enabled_by then
    insert into security_feature_gate_audit
      (gate_name, old_enabled, new_enabled, actor_id, evidence_reference)
    values
      (new.gate_name, case when tg_op = 'INSERT' then null else old.enabled end,
       new.enabled, new.enabled_by, new.evidence_reference);
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists security_feature_gates_audit on security_feature_gates;
create trigger security_feature_gates_audit
  after insert or update on security_feature_gates
  for each row execute function record_security_feature_gate_change();

create or replace function require_mfa_enrollment_release_gate()
returns trigger as $$
declare
  enrollment_open boolean;
  authentication_open boolean;
begin
  if new.mfa_enabled then
    select enabled into enrollment_open
    from security_feature_gates
    where gate_name = 'mfa_enrollment';
    select enabled into authentication_open
    from security_feature_gates
    where gate_name = 'mfa_authentication';
    if not coalesce(enrollment_open, false) or not coalesce(authentication_open, false) then
      raise exception 'MFA enrollment and authentication are disabled until the PostgreSQL release gate passes';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists users_mfa_enrollment_release_gate on users;
create trigger users_mfa_enrollment_release_gate
  before insert or update of mfa_enabled on users
  for each row execute function require_mfa_enrollment_release_gate();

create or replace function guard_user_mfa_state_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.mfa_enabled or new.auth_epoch <> 0
      or new.mfa_secret_encrypted is not null or new.mfa_enrolled_at is not null then
      raise exception 'MFA state can only be initialized through the guarded transition';
    end if;
    return new;
  end if;
  if old.mfa_enabled is distinct from new.mfa_enabled
    or old.auth_epoch is distinct from new.auth_epoch
    or old.mfa_secret_encrypted is distinct from new.mfa_secret_encrypted
    or old.mfa_enrolled_at is distinct from new.mfa_enrolled_at then
    if current_setting('app.mfa_transition_user', true) is distinct from new.id::text then
      raise exception 'MFA state changes must use transition_user_mfa';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists users_mfa_state_transition_guard on users;
create trigger users_mfa_state_transition_guard
  before insert or update of mfa_enabled, auth_epoch, mfa_secret_encrypted, mfa_enrolled_at
  on users for each row execute function guard_user_mfa_state_change();

create or replace function require_security_gate_admin_evidence()
returns trigger as $$
declare
  actor_role text;
begin
  if new.enabled then
    select role into actor_role from users where id = new.enabled_by;
    if actor_role is distinct from 'admin' then
      raise exception 'only an administrator can enable a security feature gate';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists security_feature_gates_admin_guard on security_feature_gates;
create trigger security_feature_gates_admin_guard
  before insert or update on security_feature_gates
  for each row execute function require_security_gate_admin_evidence();
drop trigger if exists security_feature_gates_updated on security_feature_gates;
create trigger security_feature_gates_updated before update on security_feature_gates
for each row execute function set_updated_at();

create or replace function validate_user_institution_assignment()
returns trigger as $$
declare
  mapping institution_domain_mappings%rowtype;
  institution_status text;
  mapping_found boolean;
  institution_found boolean;
  email_domain text;
begin
  if new.institution_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.institution_id is not distinct from new.institution_id
    and old.institution_domain_mapping_id is not distinct from new.institution_domain_mapping_id
    and old.email_verified_at is not distinct from new.email_verified_at
    and old.email is not distinct from new.email then
    return new;
  end if;

  select * into mapping
  from institution_domain_mappings
  where id = new.institution_domain_mapping_id
    and institution_id = new.institution_id;
  mapping_found := found;

  email_domain := lower(split_part(new.email, '@', 2));
  select status into institution_status from institutions where id = new.institution_id;
  institution_found := found;
  if not mapping_found
    or not institution_found
    or mapping.status <> 'active'
    or mapping.review_decision <> 'approved'
    or mapping.reviewed_by is null
    or mapping.reviewed_by = mapping.proposed_by
    or institution_status <> 'active'
    or mapping.domain <> email_domain
    or new.email_verified_at is null then
    raise exception 'institution assignment requires verified email and an eligible exact domain mapping';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists users_institution_assignment_guard on users;
create trigger users_institution_assignment_guard
  before insert or update of institution_id, institution_domain_mapping_id, email, email_verified_at
  on users for each row execute function validate_user_institution_assignment();

create or replace function validate_refresh_session_security_state()
returns trigger as $$
declare
  current_epoch integer;
  account_mfa_enabled boolean;
begin
  select auth_epoch, mfa_enabled
    into current_epoch, account_mfa_enabled
  from users
  where id = new.user_id;
  if not found or new.auth_epoch <> current_epoch then
    raise exception 'refresh session auth epoch must match the account';
  end if;
  if account_mfa_enabled and new.mfa_authenticated_at is null then
    raise exception 'MFA-enabled accounts require an MFA-authenticated refresh session';
  end if;
  if not account_mfa_enabled and new.mfa_authenticated_at is not null then
    raise exception 'non-MFA accounts cannot create an MFA-authenticated refresh session';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists refresh_tokens_security_state_guard on refresh_tokens;
create trigger refresh_tokens_security_state_guard
  before insert or update of user_id, auth_epoch, mfa_authenticated_at
  on refresh_tokens
  for each row execute function validate_refresh_session_security_state();

-- Backend services must use this transition so account epoch advancement,
-- refresh revocation and factor-material invalidation commit atomically.
create or replace function transition_user_mfa(
  p_user_id uuid,
  p_enabled boolean,
  p_encrypted_secret text default null
)
returns integer as $$
declare
  account_row users%rowtype;
  enrollment_open boolean;
  authentication_open boolean;
  resulting_epoch integer;
begin
  select * into account_row
  from users
  where id = p_user_id
  for update;
  if not found then
    raise exception 'account not found';
  end if;
  if account_row.mfa_enabled = p_enabled then
    raise exception 'MFA state transition must change the current state';
  end if;
  if p_enabled then
    if p_encrypted_secret is null or char_length(btrim(p_encrypted_secret)) = 0 then
      raise exception 'an encrypted TOTP secret is required';
    end if;
    select enabled into enrollment_open
    from security_feature_gates where gate_name = 'mfa_enrollment';
    select enabled into authentication_open
    from security_feature_gates where gate_name = 'mfa_authentication';
    if not coalesce(enrollment_open, false) or not coalesce(authentication_open, false) then
      raise exception 'MFA enrollment and authentication are disabled until the PostgreSQL release gate passes';
    end if;
  elsif p_encrypted_secret is not null then
    raise exception 'MFA secret must be cleared when disabling MFA';
  end if;

  perform set_config('app.mfa_transition_user', p_user_id::text, true);
  update users
  set mfa_enabled = p_enabled,
      mfa_secret_encrypted = case when p_enabled then p_encrypted_secret else null end,
      mfa_pending_secret_encrypted = null,
      mfa_enrolled_at = case when p_enabled then now() else null end,
      auth_epoch = auth_epoch + 1
  where id = p_user_id
  returning auth_epoch into resulting_epoch;
  perform set_config('app.mfa_transition_user', '', true);

  update refresh_tokens
  set revoked_at = coalesce(revoked_at, now())
  where user_id = p_user_id;

  update mfa_login_challenges
  set consumed_at = coalesce(consumed_at, now())
  where user_id = p_user_id and consumed_at is null;

  delete from mfa_recovery_codes where user_id = p_user_id;
  insert into audit_log (actor_id, action, entity, entity_id, meta)
  values (
    p_user_id,
    case when p_enabled then 'mfa.enabled' else 'mfa.disabled' end,
    'user',
    p_user_id,
    jsonb_build_object('authEpoch', resulting_epoch)
  );
  return resulting_epoch;
end;
$$ language plpgsql;
