-- One product can display a different uploaded photo for each color/design variant.
alter table public.product_variants add column if not exists image_url text not null default '';
