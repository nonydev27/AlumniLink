-- AlumniLink initial schema (PostgreSQL 13+; uses only built-in features, no extensions)

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------- users
create table users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  password_hash       text not null,
  role                text not null check (role in ('student', 'alumni', 'admin')),
  first_name          text not null check (char_length(first_name) between 1 and 60),
  last_name           text not null check (char_length(last_name) between 1 and 60),
  status              text not null default 'active' check (status in ('active', 'suspended')),
  -- Alumni start as 'pending' until an administrator confirms programme, year and batch.
  verification_status text not null default 'verified' check (verification_status in ('pending', 'verified', 'rejected')),
  verification_note   text,
  verified_at         timestamptz,
  verified_by         uuid references users(id) on delete set null,
  -- Consent controls: what other people may see.
  privacy             jsonb not null default '{"discoverable": true, "showEmployer": true, "showLocation": true, "shareContactWithConnections": false}'::jsonb,
  -- Accessibility and AI preferences the front end reads on every page.
  preferences         jsonb not null default '{"aiEnabled": true, "explanationLevel": "short", "highContrast": false, "textScale": 1, "reduceMotion": false}'::jsonb,
  last_login_at       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));
create index users_role_status_idx on users (role, verification_status, status);
create trigger users_updated before update on users for each row execute function set_updated_at();

create table profiles (
  user_id          uuid primary key references users(id) on delete cascade,
  headline         text check (char_length(headline) <= 160),
  bio              text check (char_length(bio) <= 2000),
  programme        text,
  graduation_year  int check (graduation_year between 1950 and 2100),
  batch            text,
  current_company  text,
  job_title        text,
  industry         text,
  location         text,
  skills           text[] not null default '{}',
  interests        text[] not null default '{}',
  career_goals     text[] not null default '{}',
  willing_to_mentor boolean not null default false,
  linkedin_url     text,
  phone            text,
  avatar_url       text,
  avatar_alt       text check (char_length(avatar_alt) <= 200),
  updated_at       timestamptz not null default now()
);
create index profiles_programme_idx on profiles (lower(programme));
create index profiles_industry_idx on profiles (lower(industry));
create index profiles_graduation_year_idx on profiles (graduation_year);
create index profiles_mentors_idx on profiles (willing_to_mentor) where willing_to_mentor;
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index refresh_tokens_user_idx on refresh_tokens (user_id);

-- ---------------------------------------------------------------- networking
create table connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  recipient_id uuid not null references users(id) on delete cascade,
  kind         text not null default 'connect' check (kind in ('connect', 'mentorship')),
  message      text check (char_length(message) <= 1000),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);
-- At most one live request/connection per pair of people, whichever way round it was sent.
create unique index connections_live_pair_key
  on connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');
create index connections_recipient_idx on connections (recipient_id, status);
create index connections_requester_idx on connections (requester_id, status);

create table blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

-- ---------------------------------------------------------------- messaging
create table conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references users(id) on delete cascade,
  user_b          uuid not null references users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index conversations_user_b_idx on conversations (user_b);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references users(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 4000),
  status          text not null default 'visible' check (status in ('visible', 'hidden')),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at desc);
create index messages_unread_idx on messages (conversation_id, sender_id) where read_at is null;

-- ---------------------------------------------------------------- batch groups
create table groups (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'batch' check (kind in ('batch')),
  name            text not null,
  programme       text not null,
  graduation_year int not null,
  created_at      timestamptz not null default now()
);
create unique index groups_batch_key on groups (lower(programme), graduation_year);

create table group_members (
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on group_members (user_id);

create table group_posts (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  author_id  uuid not null references users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  status     text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);
create index group_posts_feed_idx on group_posts (group_id, created_at desc);

-- ---------------------------------------------------------------- opportunities
create table opportunities (
  id          uuid primary key default gen_random_uuid(),
  posted_by   uuid not null references users(id) on delete cascade,
  type        text not null check (type in ('job', 'internship', 'event', 'reunion', 'webinar')),
  title       text not null check (char_length(title) between 3 and 160),
  description text not null check (char_length(description) <= 5000),
  company     text,
  location    text,
  industry    text,
  is_remote   boolean not null default false,
  apply_url   text,
  event_date  timestamptz,
  deadline    timestamptz,
  tags        text[] not null default '{}',
  status      text not null default 'active' check (status in ('active', 'closed', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index opportunities_feed_idx on opportunities (status, created_at desc);
create index opportunities_type_idx on opportunities (type);
create index opportunities_poster_idx on opportunities (posted_by);
create trigger opportunities_updated before update on opportunities for each row execute function set_updated_at();

-- ---------------------------------------------------------------- AI suggestions
-- One row per (user, suggested mentor/opportunity). Lets people accept, dismiss, rate and report
-- a suggestion, and keeps dismissed suggestions from coming back.
create table ai_suggestions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references users(id) on delete cascade,
  kind                   text not null check (kind in ('mentor_match', 'opportunity')),
  subject_user_id        uuid references users(id) on delete cascade,
  subject_opportunity_id uuid references opportunities(id) on delete cascade,
  score                  int not null,
  confidence             text not null check (confidence in ('strong', 'good', 'possible')),
  reasons                jsonb not null default '[]'::jsonb,
  status                 text not null default 'shown' check (status in ('shown', 'accepted', 'dismissed')),
  helpful                boolean,
  feedback_comment       text check (char_length(feedback_comment) <= 1000),
  created_at             timestamptz not null default now(),
  responded_at           timestamptz,
  check (
    (kind = 'mentor_match' and subject_user_id is not null) or
    (kind = 'opportunity' and subject_opportunity_id is not null)
  )
);
create unique index ai_suggestions_mentor_key on ai_suggestions (user_id, subject_user_id) where kind = 'mentor_match';
create unique index ai_suggestions_opportunity_key on ai_suggestions (user_id, subject_opportunity_id) where kind = 'opportunity';

-- ---------------------------------------------------------------- moderation
create table reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references users(id) on delete set null,
  target_type     text not null check (target_type in ('user', 'message', 'opportunity', 'group_post', 'ai_suggestion')),
  target_id       uuid not null,
  reason          text not null check (reason in ('spam', 'harassment', 'inappropriate', 'fake_profile', 'unsafe', 'bad_match', 'other')),
  details         text check (char_length(details) <= 2000),
  status          text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  resolved_by     uuid references users(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);
create index reports_status_idx on reports (status, created_at desc);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references users(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, entity_id);
