-- Durable in-app notification state and mentorship relationships.

create table if not exists notification_preferences (
  user_id             uuid not null references users(id) on delete cascade,
  notification_type   text not null check (char_length(btrim(notification_type)) between 1 and 80),
  in_app_enabled      boolean not null default true,
  email_enabled       boolean not null default true,
  updated_at          timestamptz not null default now(),
  primary key (user_id, notification_type)
);

create table if not exists notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  notification_type text not null check (char_length(btrim(notification_type)) between 1 and 80),
  title           text not null check (char_length(title) between 1 and 160),
  body            text not null check (char_length(body) between 1 and 1000),
  data            jsonb not null default '{}'::jsonb,
  dedupe_key      text,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_feed_idx
  on notifications (user_id, created_at desc, id desc);
create index if not exists notifications_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

-- This table is a durable queue, not proof of external delivery. A provider adapter
-- must claim work with a lease; delivery state is only set after provider confirmation.
create table if not exists notification_outbox (
  id                  uuid primary key default gen_random_uuid(),
  notification_id     uuid references notifications(id) on delete cascade,
  user_id             uuid not null references users(id) on delete cascade,
  notification_type   text not null check (char_length(btrim(notification_type)) between 1 and 80),
  channel             text not null check (channel = 'email'),
  dedupe_key          text not null unique,
  payload             jsonb not null default '{}'::jsonb,
  status              text not null default 'queued'
                      check (status in ('queued', 'processing', 'retry', 'delivered', 'failed')),
  attempt_count       integer not null default 0 check (attempt_count between 0 and 20),
  max_attempts        integer not null default 5 check (max_attempts between 1 and 20),
  available_at        timestamptz not null default now(),
  locked_until        timestamptz,
  locked_by           text,
  last_error          text,
  delivered_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (attempt_count <= max_attempts),
  check (
    (status = 'processing' and locked_until is not null and locked_by is not null)
    or
    (status <> 'processing' and locked_until is null and locked_by is null)
  ),
  check (not (payload ?| array['token', 'rawToken', 'verificationToken', 'resetToken', 'secret'])),
  check ((status = 'delivered') = (delivered_at is not null))
);
create index if not exists notification_outbox_claim_idx
  on notification_outbox (available_at, created_at)
  where status in ('queued', 'retry');
create index if not exists notification_outbox_lease_idx
  on notification_outbox (locked_until)
  where status = 'processing';
create index if not exists notification_outbox_user_idx
  on notification_outbox (user_id, created_at desc);
drop trigger if exists notification_outbox_updated on notification_outbox;
create trigger notification_outbox_updated before update on notification_outbox
for each row execute function set_updated_at();

create table if not exists notification_delivery_attempts (
  id                  uuid primary key default gen_random_uuid(),
  outbox_id           uuid not null references notification_outbox(id) on delete cascade,
  attempt_number      integer not null check (attempt_number between 1 and 20),
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  outcome             text not null check (outcome in ('started', 'delivered', 'retryable_failure', 'terminal_failure')),
  provider_reference  text,
  error_code          text,
  created_at          timestamptz not null default now(),
  unique (outbox_id, attempt_number),
  check (completed_at is null or completed_at >= started_at)
);
create index if not exists notification_delivery_attempts_outbox_idx
  on notification_delivery_attempts (outbox_id, attempt_number desc);

create table if not exists mentorships (
  id              uuid primary key default gen_random_uuid(),
  connection_id   uuid not null unique references connections(id) on delete restrict,
  mentor_id       uuid not null references users(id) on delete restrict,
  mentee_id       uuid not null references users(id) on delete restrict,
  status          text not null default 'active' check (status in ('active', 'paused', 'completed')),
  started_at      timestamptz not null default now(),
  paused_at       timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (mentor_id <> mentee_id),
  check (
    (status = 'active' and completed_at is null)
    or (status = 'paused' and completed_at is null and paused_at is not null)
    or (status = 'completed' and completed_at is not null)
  ),
  check ((status = 'paused') = (paused_at is not null))
);
create unique index if not exists mentorships_live_pair_key
  on mentorships (least(mentor_id, mentee_id), greatest(mentor_id, mentee_id))
  where status in ('active', 'paused');
create index if not exists mentorships_mentor_status_idx
  on mentorships (mentor_id, status, started_at desc);
create index if not exists mentorships_mentee_status_idx
  on mentorships (mentee_id, status, started_at desc);

create or replace function validate_mentorship_connection()
returns trigger as $$
declare
  source_connection connections%rowtype;
begin
  select * into source_connection
  from connections
  where id = new.connection_id;
  if not found
    or source_connection.kind <> 'mentorship'
    or source_connection.status <> 'accepted'
    or least(source_connection.requester_id, source_connection.recipient_id)
       <> least(new.mentor_id, new.mentee_id)
    or greatest(source_connection.requester_id, source_connection.recipient_id)
       <> greatest(new.mentor_id, new.mentee_id) then
    raise exception 'mentorship must be linked to an accepted mentorship connection for the same participants';
  end if;
  return new;
end;
$$ language plpgsql;
drop trigger if exists mentorships_connection_guard on mentorships;
create trigger mentorships_connection_guard
  before insert or update of connection_id, mentor_id, mentee_id on mentorships
  for each row execute function validate_mentorship_connection();

drop trigger if exists mentorships_updated on mentorships;
create trigger mentorships_updated before update on mentorships
for each row execute function set_updated_at();
