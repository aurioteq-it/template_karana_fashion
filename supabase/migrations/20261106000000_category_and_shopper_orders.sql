-- Apply to existing Karana Fashion projects after the initial schema.
alter table public.products add column if not exists category text not null default '';
alter table public.products add constraint products_category_length check (length(category) <= 80);

update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
where id = 'product-images';

alter table public.business_settings
  add column if not exists facebook_pixel_id text not null default '',
  add column if not exists facebook_domain_verification text not null default '',
  add column if not exists google_analytics_id text not null default '',
  add column if not exists google_tag_manager_id text not null default '',
  add column if not exists google_domain_verification text not null default '',
  add column if not exists tracking_enabled boolean not null default false;

create or replace view public.public_business_settings with (security_barrier = true) as
select brand_name, contact_phone, support_hours, delivery_note, return_policy, privacy_policy, terms,
       facebook_pixel_id, facebook_domain_verification, google_analytics_id,
       google_tag_manager_id, google_domain_verification, tracking_enabled
from public.business_settings;

alter table public.orders add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_customer_user_id_idx on public.orders(customer_user_id, created_at desc) where customer_user_id is not null;
create policy orders_customer_read on public.orders for select to authenticated using (customer_user_id = (select auth.uid()));

-- New two-argument function: the Edge Function supplies shopper_user_id only
-- after verifying the Auth token. The existing one-argument function remains
-- unchanged during rollout, so it cannot trust a client-supplied shopper ID.
create or replace function public.place_cod_order(payload jsonb, shopper_user_id uuid)
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
  v_customer_user_id uuid;
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
  v_customer_user_id := shopper_user_id;
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
    submission_key, reference, customer_user_id, name, phone, district, area, address,
    product_id, variant_id, product_name, variant_label, quantity,
    unit_price, delivery_fee, total
  ) values (
    v_key, v_reference, v_customer_user_id, v_name, v_phone, v_district, v_area, v_address,
    v_product.id, v_variant.id, v_product.name, v_variant.label, v_quantity,
    v_variant.price, v_zone.fee, v_variant.price * v_quantity + v_zone.fee
  );
  update public.product_variants set stock = stock - v_quantity where id = v_variant.id;
  return jsonb_build_object('reference', v_reference);
end $$;
revoke all on function public.place_cod_order(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.place_cod_order(jsonb, uuid) to service_role;


