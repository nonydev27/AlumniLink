-- Auth-epoch transitions outside MFA and durable analytics aggregates.

create table if not exists profile_daily_stats (
  profile_owner_id       uuid not null references users(id) on delete cascade,
  stat_date              date not null,
  views                  bigint not null default 0 check (views >= 0),
  search_appearances     bigint not null default 0 check (search_appearances >= 0),
  updated_at             timestamptz not null default now(),
  primary key (profile_owner_id, stat_date)
);

create or replace function guard_user_mfa_state_change()
returns trigger as $$
declare
  mfa_transition_user text;
  epoch_transition_user text;
begin
  if tg_op = 'INSERT' then
    if new.mfa_enabled or new.auth_epoch <> 0
      or new.mfa_secret_encrypted is not null or new.mfa_enrolled_at is not null then
      raise exception 'MFA state can only be initialized through the guarded transition';
    end if;
    return new;
  end if;

  mfa_transition_user := current_setting('app.mfa_transition_user', true);
  epoch_transition_user := current_setting('app.auth_epoch_transition_user', true);

  if old.mfa_enabled is distinct from new.mfa_enabled
    or old.auth_epoch is distinct from new.auth_epoch
    or old.mfa_secret_encrypted is distinct from new.mfa_secret_encrypted
    or old.mfa_enrolled_at is distinct from new.mfa_enrolled_at then
    if mfa_transition_user = new.id::text then
      return new;
    end if;
    if epoch_transition_user = new.id::text
      and old.mfa_enabled is not distinct from new.mfa_enabled
      and old.mfa_secret_encrypted is not distinct from new.mfa_secret_encrypted
      and old.mfa_pending_secret_encrypted is not distinct from new.mfa_pending_secret_encrypted
      and old.mfa_enrolled_at is not distinct from new.mfa_enrolled_at
      and new.auth_epoch = old.auth_epoch + 1 then
      return new;
    end if;
    raise exception 'MFA state changes must use transition_user_mfa; auth epochs must use advance_user_auth_epoch';
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function advance_user_auth_epoch(p_user_id uuid, p_action text)
returns integer as $$
declare
  account_row users%rowtype;
  resulting_epoch integer;
begin
  if p_action not in ('password_changed', 'account_deactivated', 'account_reactivated', 'sessions_revoked') then
    raise exception 'unsupported auth epoch action';
  end if;

  select * into account_row
  from users
  where id = p_user_id
  for update;
  if not found then
    raise exception 'account not found';
  end if;

  perform set_config('app.auth_epoch_transition_user', p_user_id::text, true);
  update users
  set auth_epoch = auth_epoch + 1
  where id = p_user_id
  returning auth_epoch into resulting_epoch;
  perform set_config('app.auth_epoch_transition_user', '', true);

  update refresh_tokens
  set revoked_at = coalesce(revoked_at, now())
  where user_id = p_user_id;
  update mfa_login_challenges
  set consumed_at = coalesce(consumed_at, now())
  where user_id = p_user_id and consumed_at is null;
  insert into audit_log (actor_id, action, entity, entity_id, meta)
  values (p_user_id, p_action, 'user', p_user_id, jsonb_build_object('authEpoch', resulting_epoch));

  return resulting_epoch;
end;
$$ language plpgsql;
