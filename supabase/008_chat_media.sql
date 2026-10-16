-- ATELIER.GE — photos and files in the chat.
-- Run once in Supabase Dashboard → SQL Editor. Safe to run again.

-- Messages can carry one attachment: {"path", "name", "type", "size"}
alter table public.messages add column if not exists attachment jsonb;

-- A customer may only attach files from their own folder
drop policy if exists messages_customer_insert on public.messages;
create policy messages_customer_insert on public.messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and sender = 'user'
    and (attachment is null or attachment ->> 'path' like auth.uid()::text || '/%')
  );

-- PRIVATE bucket: files are opened only through short-lived signed links
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-files', 'chat-files', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each customer (including chat guests) uploads only into the folder named
-- after their own user id; the admin can upload into any conversation
drop policy if exists "chat files: upload" on storage.objects;
create policy "chat files: upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ...and can open only their own conversation's files; the admin sees all
drop policy if exists "chat files: read" on storage.objects;
create policy "chat files: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "chat files: admin delete" on storage.objects;
create policy "chat files: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-files' and public.is_admin());
