-- An invitation is pending until the invited person confirms the email and sets a password.
alter table public.profiles add column if not exists invitation_accepted_at timestamptz;

-- Preserve established staff accounts. Existing invited users without a password remain pending.
update public.profiles as p
set invitation_accepted_at = coalesce(u.last_sign_in_at, p.created_at)
from auth.users as u
where p.id = u.id and p.role = 'staff' and p.invitation_accepted_at is null
  and (u.invited_at is null or (u.email_confirmed_at is not null and nullif(u.encrypted_password, '') is not null));

update public.profiles
set active = false
where role = 'staff' and invitation_accepted_at is null;

create or replace function public.has_role(allowed_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role = allowed_role
      and (role = 'admin' or invitation_accepted_at is not null)
  )
$$;

create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles
    where id = (select auth.uid()) and active and role in ('admin', 'staff')
      and (role = 'admin' or invitation_accepted_at is not null)
  )
$$;

-- The client may activate only established staff. Acceptance itself is handled by the RPC below.
revoke insert, update, delete on public.profiles from authenticated;
grant update (active) on public.profiles to authenticated;

create or replace function public.complete_staff_invitation()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles as p
  set invitation_accepted_at = now(), active = true
  where p.id = (select auth.uid()) and p.role = 'staff'
    and p.invitation_accepted_at is null
    and exists (
      select 1 from auth.users as u
      where u.id = p.id and u.invited_at is not null
        and u.email_confirmed_at is not null
        and nullif(u.encrypted_password, '') is not null
    );
  if not found then
    raise exception 'Invitation is not ready to complete';
  end if;
end
$$;
revoke all on function public.complete_staff_invitation() from public, anon;
grant execute on function public.complete_staff_invitation() to authenticated;
