-- Run once in a fresh, dedicated Supabase project for this client.
-- All prices are BDT. The public role cannot read orders or staff records.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  subtitle text not null default '',
  description text not null default '',
  details text[] not null default '{}',
  image_urls text[] not null default '{}',
  active boolean not null default false,
  is_demo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_active_product on public.products(active) where active;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  sku text not null unique,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  fee numeric(12,2) not null check (fee >= 0),
  active boolean not null default true
);

create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  contact_phone text not null default '',
  support_hours text not null default '',
  delivery_note text not null default '',
  return_policy text not null default '',
  privacy_policy text not null default '',
  terms text not null default '',
  updated_at timestamptz not null default now()
);
create unique index single_settings_row on public.business_settings ((true));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  reference text not null unique,
  status text not null default 'new' check (status in ('new','confirmed','processing','shipped','delivered','cancelled','returned')),
  name text not null,
  phone text not null,
  district text not null,
  area text not null,
  address text not null,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  variant_label text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_price numeric(12,2) not null,
  delivery_fee numeric(12,2) not null,
  total numeric(12,2) not null,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_phone_idx on public.orders(phone);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references auth.users(id),
  old_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(allowed_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and active and role = allowed_role)
$$;
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to anon, authenticated;

create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and active and role in ('admin','staff'))
$$;
revoke all on function public.is_team_member() from public;
grant execute on function public.is_team_member() to authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.business_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.has_role('admin'));
create policy profiles_admin_write on public.profiles for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy products_public_read on public.products for select to anon, authenticated using (active or public.has_role('admin'));
create policy products_admin_write on public.products for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy variants_public_read on public.product_variants for select to anon, authenticated using ((active and exists (select 1 from public.products p where p.id = product_id and p.active)) or public.has_role('admin'));
create policy variants_admin_write on public.product_variants for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy zones_public_read on public.delivery_zones for select to anon, authenticated using (active or public.has_role('admin'));
create policy zones_admin_write on public.delivery_zones for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy settings_admin on public.business_settings for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy orders_team_read on public.orders for select to authenticated using (public.is_team_member());
create policy orders_team_update on public.orders for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy events_team_read on public.order_events for select to authenticated using (public.is_team_member());

-- The view contains only fields approved for public display. The base table remains admin-only.
create view public.public_business_settings with (security_barrier = true) as
select brand_name, contact_phone, support_hours, delivery_note, return_policy, privacy_policy, terms
from public.business_settings;

revoke all on public.profiles, public.products, public.product_variants, public.delivery_zones, public.business_settings, public.orders, public.order_events from anon, authenticated;
grant select on public.products, public.product_variants, public.delivery_zones to anon, authenticated;
grant select on public.public_business_settings to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.products, public.product_variants, public.delivery_zones, public.business_settings to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_events to authenticated;

create or replace function public.guard_order_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (to_jsonb(new) - 'status' - 'internal_note' - 'updated_at') is distinct from
     (to_jsonb(old) - 'status' - 'internal_note' - 'updated_at') then
    raise exception 'Only order status and internal notes may be changed';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger orders_guard before update on public.orders for each row execute function public.guard_order_update();

create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events(order_id, actor_id, old_status, new_status)
    values (new.id, (select auth.uid()), old.status, new.status);
  end if;
  return new;
end $$;
create trigger orders_log_status after update on public.orders for each row execute function public.log_order_status();

-- Called only by the Edge Function with its server-side service role.
-- Advisory lock protects repeated simultaneous submissions; row lock protects stock.
create or replace function public.place_cod_order(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_key uuid;
  v_existing public.orders%rowtype;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_quantity integer;
  v_name text;
  v_phone text;
  v_district text;
  v_area text;
  v_address text;
  v_reference text;
begin
  begin
    v_key := (payload->>'submission_key')::uuid;
    v_quantity := (payload->>'quantity')::integer;
  exception when others then
    raise exception 'Invalid submission key or quantity';
  end;
  if v_key is null or v_quantity is null or v_quantity not between 1 and 10 then raise exception 'Invalid quantity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_key::text, 0));
  select * into v_existing from public.orders where submission_key = v_key;
  if found then return jsonb_build_object('reference', v_existing.reference); end if;

  v_name := trim(coalesce(payload->>'name',''));
  v_phone := regexp_replace(coalesce(payload->>'phone',''), '[[:space:]-]', '', 'g');
  v_district := trim(coalesce(payload->>'district',''));
  v_area := trim(coalesce(payload->>'area',''));
  v_address := trim(coalesce(payload->>'address',''));
  if length(v_name) not between 2 and 80 or length(v_district) not between 2 and 80
    or length(v_area) not between 2 and 100 or length(v_address) not between 8 and 300
    or v_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'Please check the shipping details';
  end if;

  begin
    select * into v_variant from public.product_variants where id = (payload->>'variant_id')::uuid and active for update;
    select * into v_zone from public.delivery_zones where id = (payload->>'zone_id')::uuid and active;
  exception when invalid_text_representation then
    raise exception 'Invalid product or delivery zone';
  end;
  if v_variant.id is null or v_zone.id is null then raise exception 'Product or delivery zone unavailable'; end if;
  select * into v_product from public.products where id = v_variant.product_id and active and not is_demo;
  if v_product.id is null then raise exception 'Product unavailable'; end if;
  if v_variant.stock < v_quantity then raise exception 'Requested quantity is out of stock'; end if;

  v_reference := 'KF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.orders (
    submission_key, reference, name, phone, district, area, address,
    product_id, variant_id, product_name, variant_label, quantity,
    unit_price, delivery_fee, total
  ) values (
    v_key, v_reference, v_name, v_phone, v_district, v_area, v_address,
    v_product.id, v_variant.id, v_product.name, v_variant.label, v_quantity,
    v_variant.price, v_zone.fee, v_variant.price * v_quantity + v_zone.fee
  );
  update public.product_variants set stock = stock - v_quantity where id = v_variant.id;
  return jsonb_build_object('reference', v_reference);
end $$;
revoke all on function public.place_cod_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_cod_order(jsonb) to service_role;

-- Public product image storage. Upload and removal remain admin-only.
insert into storage.buckets(id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy product_images_read on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role('admin'));
create policy product_images_admin_update on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role('admin')) with check (bucket_id = 'product-images' and public.has_role('admin'));
create policy product_images_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role('admin'));
