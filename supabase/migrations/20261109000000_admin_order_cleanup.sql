-- A service-role-only transaction for clearing orders and their customer history.
create table if not exists public.order_history_purges (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  deleted_orders integer not null,
  created_at timestamptz not null default now()
);
alter table public.order_history_purges enable row level security;
revoke all on public.order_history_purges from public, anon, authenticated;

create or replace function public.admin_clear_order_history(admin_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  deleted_count integer;
begin
  if not exists (
    select 1 from public.profiles
    where id = admin_user_id and role = 'admin' and active
  ) then raise exception 'Admin access required'; end if;
  if exists (select 1 from public.products where active and not is_demo) then
    raise exception 'Pause checkout before cleaning order history';
  end if;

  lock table public.orders in access exclusive mode;
  select count(*) into deleted_count from public.orders;
  delete from public.orders;
  insert into public.order_history_purges(admin_user_id, deleted_orders)
  values (admin_user_id, deleted_count);
  return deleted_count;
end $$;
revoke all on function public.admin_clear_order_history(uuid) from public, anon, authenticated;
grant execute on function public.admin_clear_order_history(uuid) to service_role;
