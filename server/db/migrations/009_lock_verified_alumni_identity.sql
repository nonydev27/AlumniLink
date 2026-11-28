-- Programme and graduation year are confirmed during alumni review. Once an
-- alumni account is verified they may only change through an approved
-- alumni_transition_request, which sets app.identity_transition_user in the
-- reviewing transaction. No student index/reference number is involved.

create or replace function guard_verified_alumni_identity()
returns trigger as $$
declare
  verified_alumni boolean;
  transition_user text;
begin
  if old.programme is distinct from new.programme
     or old.graduation_year is distinct from new.graduation_year then
    select exists (
      select 1 from users
      where id = new.user_id and role = 'alumni' and verification_status = 'verified'
    ) into verified_alumni;

    if verified_alumni then
      transition_user := nullif(current_setting('app.identity_transition_user', true), '');
      if transition_user is distinct from new.user_id::text then
        raise exception 'verified alumni identity fields require an approved alumni transition request';
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_verified_alumni_identity_guard on profiles;
create trigger profiles_verified_alumni_identity_guard
  before update of programme, graduation_year on profiles
  for each row execute function guard_verified_alumni_identity();
