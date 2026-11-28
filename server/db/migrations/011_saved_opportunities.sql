-- Saved opportunity suggestions and provenance for reviewed identity changes.

create table if not exists saved_opportunities (
  user_id uuid not null references users(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

create index if not exists saved_opportunities_user_saved_idx
  on saved_opportunities (user_id, saved_at desc);

-- A transition must still be for the role the person held when they applied.
-- Otherwise an approval can succeed after the account has changed identity.
alter table alumni_transition_requests
  add column if not exists submitted_role text;

update alumni_transition_requests r
   set submitted_role = u.role
  from users u
 where u.id = r.user_id and r.submitted_role is null;

update alumni_transition_requests
   set submitted_role = 'student'
 where submitted_role is null;

alter table alumni_transition_requests
  alter column submitted_role set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'alumni_transition_requests_submitted_role_check') then
    alter table alumni_transition_requests
      add constraint alumni_transition_requests_submitted_role_check
      check (submitted_role in ('student', 'alumni'));
  end if;
end $$;
