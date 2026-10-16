-- ATELIER.GE — chat read receipts ("ნანახია").
-- Run once in Supabase Dashboard → SQL Editor. Safe to run again.
alter table public.messages add column if not exists read_at timestamptz;

-- Nobody can edit messages; only the read time can be set
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- A customer marks the store's replies in their own conversation as read
drop policy if exists messages_customer_mark_read on public.messages;
create policy messages_customer_mark_read on public.messages
  for update to authenticated
  using (user_id = auth.uid() and sender = 'store')
  with check (user_id = auth.uid() and sender = 'store');

-- The admin marks customers' messages as read
drop policy if exists messages_admin_mark_read on public.messages;
create policy messages_admin_mark_read on public.messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
