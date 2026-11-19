-- Student -> alumni transition requests are explicit, reviewable records. Only
-- an administrator can apply the transition, and no student reference number is
-- stored (project-board decision).

create table if not exists alumni_transition_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  programme        text not null check (char_length(btrim(programme)) between 2 and 120),
  graduation_year  integer not null check (graduation_year between 1960 and 2100),
  evidence_url     text,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note             text check (note is null or char_length(note) <= 500),
  decided_at       timestamptz,
  decided_by       uuid references users(id) on delete restrict,
  created_at       timestamptz not null default now(),
  check ((status = 'pending') = (decided_at is null))
);
create unique index if not exists alumni_transition_requests_one_live
  on alumni_transition_requests (user_id) where status = 'pending';
create index if not exists alumni_transition_requests_status_idx
  on alumni_transition_requests (status, created_at);
