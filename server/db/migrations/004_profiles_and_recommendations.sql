-- Structured profile sections, career preferences, endorsements and recommendations.

alter table profiles
  add column if not exists seeking_mentorship boolean not null default false;

alter table users
  add column if not exists handle text,
  add column if not exists public_profile_indexable boolean not null default false,
  add column if not exists featured_mentor_opt_in boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_handle_format') then
    alter table users add constraint users_handle_format check (
      handle is null or handle ~ '^[a-z0-9][a-z0-9_-]*$'
    );
  end if;
end
$$;
create unique index if not exists users_handle_key
  on users (lower(handle))
  where handle is not null;
create index if not exists users_public_profile_idx
  on users (public_profile_indexable, handle)
  where public_profile_indexable and handle is not null;
create index if not exists users_featured_mentor_idx
  on users (featured_mentor_opt_in)
  where featured_mentor_opt_in;
create index if not exists profiles_seeking_mentorship_idx
  on profiles (seeking_mentorship)
  where seeking_mentorship;

create table if not exists profile_education (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  school_name         text not null check (char_length(btrim(school_name)) between 1 and 200),
  degree              text check (degree is null or char_length(degree) <= 120),
  field_of_study      text check (field_of_study is null or char_length(field_of_study) <= 160),
  start_date          date,
  end_date            date,
  grade               text check (grade is null or char_length(grade) <= 80),
  coursework          text[] not null default '{}',
  honours             text[] not null default '{}',
  visibility          text not null default 'connections'
                        check (visibility in ('private', 'connections', 'public')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);
create index if not exists profile_education_user_idx
  on profile_education (user_id, start_date desc nulls last, created_at);
drop trigger if exists profile_education_updated on profile_education;
create trigger profile_education_updated before update on profile_education
for each row execute function set_updated_at();

create table if not exists profile_experience (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  kind                text not null check (kind in ('work', 'leadership', 'volunteer')),
  title               text not null check (char_length(btrim(title)) between 1 and 160),
  organization        text not null check (char_length(btrim(organization)) between 1 and 200),
  start_date          date,
  end_date            date,
  is_current          boolean not null default false,
  description         text check (description is null or char_length(description) <= 3000),
  tags                text[] not null default '{}',
  visibility          text not null default 'connections'
                        check (visibility in ('private', 'connections', 'public')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date),
  check (not is_current or end_date is null)
);
create index if not exists profile_experience_user_idx
  on profile_experience (user_id, start_date desc nulls last, created_at);
drop trigger if exists profile_experience_updated on profile_experience;
create trigger profile_experience_updated before update on profile_experience
for each row execute function set_updated_at();

create table if not exists profile_projects (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  kind                text not null check (kind in ('project', 'publication')),
  title               text not null check (char_length(btrim(title)) between 1 and 200),
  description         text check (description is null or char_length(description) <= 4000),
  tags                text[] not null default '{}',
  safe_url            text check (safe_url is null or char_length(safe_url) <= 2048),
  status              text not null default 'active' check (status in ('active', 'draft', 'archived')),
  visibility          text not null default 'connections'
                        check (visibility in ('private', 'connections', 'public')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (safe_url is null or safe_url ~* '^https?://')
);
create index if not exists profile_projects_user_idx
  on profile_projects (user_id, status, created_at desc);
drop trigger if exists profile_projects_updated on profile_projects;
create trigger profile_projects_updated before update on profile_projects
for each row execute function set_updated_at();

create table if not exists career_preferences (
  user_id             uuid primary key references users(id) on delete cascade,
  desired_roles       text[] not null default '{}',
  desired_industries  text[] not null default '{}',
  desired_locations   text[] not null default '{}',
  availability        text check (availability is null or char_length(availability) <= 80),
  open_to_work        boolean not null default false,
  visibility          text not null default 'private'
                        check (visibility in ('private', 'connections', 'public')),
  updated_at          timestamptz not null default now()
);
create index if not exists career_preferences_open_to_work_idx
  on career_preferences (open_to_work)
  where open_to_work;
drop trigger if exists career_preferences_updated on career_preferences;
create trigger career_preferences_updated before update on career_preferences
for each row execute function set_updated_at();

create table if not exists skill_endorsements (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null references users(id) on delete cascade,
  endorser_user_id    uuid not null references users(id) on delete cascade,
  skill               text not null check (char_length(btrim(skill)) between 1 and 100),
  skill_normalized    text generated always as (lower(btrim(skill))) stored,
  created_at          timestamptz not null default now(),
  check (owner_user_id <> endorser_user_id),
  unique (owner_user_id, endorser_user_id, skill_normalized)
);
create index if not exists skill_endorsements_owner_idx
  on skill_endorsements (owner_user_id, skill_normalized, created_at desc);

create table if not exists recommendation_requests (
  id                  uuid primary key default gen_random_uuid(),
  requester_user_id   uuid not null references users(id) on delete cascade,
  author_user_id      uuid not null references users(id) on delete cascade,
  subject_user_id     uuid not null references users(id) on delete cascade,
  status              text not null default 'requested'
                        check (status in ('requested', 'drafted', 'approved', 'hidden', 'withdrawn')),
  request_message     text check (request_message is null or char_length(request_message) <= 1000),
  recommendation_text text check (recommendation_text is null or char_length(recommendation_text) <= 4000),
  requested_at        timestamptz not null default now(),
  drafted_at          timestamptz,
  decided_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (author_user_id <> subject_user_id),
  check (requester_user_id in (author_user_id, subject_user_id)),
  check (
    status not in ('drafted', 'approved', 'hidden')
    or (recommendation_text is not null and char_length(btrim(recommendation_text)) > 0)
  ),
  check (status <> 'approved' or decided_at is not null),
  check (status <> 'hidden' or decided_at is not null)
);
create unique index if not exists recommendation_requests_open_pair_key
  on recommendation_requests (author_user_id, subject_user_id)
  where status in ('requested', 'drafted');
create index if not exists recommendation_requests_subject_status_idx
  on recommendation_requests (subject_user_id, status, requested_at desc);
create index if not exists recommendation_requests_author_status_idx
  on recommendation_requests (author_user_id, status, requested_at desc);
drop trigger if exists recommendation_requests_updated on recommendation_requests;
create trigger recommendation_requests_updated before update on recommendation_requests
for each row execute function set_updated_at();
