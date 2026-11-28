-- Tier 2: moderation evidence, two-sided mentorship completion, author deletion.
-- Snapshots are captured server-side when a report is filed so moderators can
-- still act after the author hides or deletes the original content.

alter table reports
  add column if not exists content_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists target_author_id uuid references users(id) on delete set null;

create index if not exists reports_queue_idx on reports (status, target_type, created_at);

-- The first completion request records intent; only the counterpart finalises it.
alter table mentorships
  add column if not exists completion_requested_by uuid references users(id) on delete set null;

-- Authors may remove their own content. Rows stay for audit and report continuity.
alter table messages drop constraint if exists messages_status_check;
alter table messages add constraint messages_status_check check (status in ('visible', 'hidden', 'deleted'));

alter table group_posts drop constraint if exists group_posts_status_check;
alter table group_posts add constraint group_posts_status_check check (status in ('visible', 'hidden', 'deleted'));

alter table opportunities drop constraint if exists opportunities_status_check;
alter table opportunities add constraint opportunities_status_check check (status in ('active', 'closed', 'hidden', 'deleted'));

-- Endorsements may only name skills the owner actually claims. Remove stale rows
-- created before server-side validation so they cannot surface on a profile.
delete from skill_endorsements e
 where not exists (
   select 1 from profiles p, unnest(p.skills) claimed
    where p.user_id = e.owner_user_id and lower(btrim(claimed)) = e.skill_normalized
 );

-- Moderation history is append-only: actioning a report must never erase the trail.
create or replace function forbid_audit_log_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

drop trigger if exists audit_log_append_only on audit_log;
create trigger audit_log_append_only
  before update or delete on audit_log
  for each row execute function forbid_audit_log_mutation();
