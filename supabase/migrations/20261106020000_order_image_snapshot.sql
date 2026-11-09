-- Keep the selected product/design photo on every new order.
alter table public.orders add column if not exists product_image_url text not null default '';

create or replace function public.set_order_product_image()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.product_image_url := coalesce((
    select coalesce(nullif(v.image_url, ''), p.image_urls[1], '')
    from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = new.variant_id and p.id = new.product_id
  ), '');
  return new;
end $$;
revoke all on function public.set_order_product_image() from public, anon, authenticated;

drop trigger if exists orders_product_image on public.orders;
create trigger orders_product_image before insert on public.orders
for each row execute function public.set_order_product_image();
