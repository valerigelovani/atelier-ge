-- ATELIER.GE — photo uploads from the admin panel (Supabase Storage).
-- Run once in Supabase Dashboard → SQL Editor. Safe to run again.

-- Public bucket: anyone can view photos, max 5 MB, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Only admins can upload, replace or delete photos
drop policy if exists "product images: admin upload" on storage.objects;
create policy "product images: admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin update" on storage.objects;
create policy "product images: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin delete" on storage.objects;
create policy "product images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
