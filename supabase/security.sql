-- ATELIER.GE — database security (Row Level Security)
--
-- Run this whole file once in Supabase Dashboard → SQL Editor.
-- It is safe to run again later (e.g. after adding a new admin).
--
-- BEFORE running: create the admin accounts in Dashboard → Authentication →
-- Users → "Add user" (with a NEW strong password), then put their emails in
-- the INSERT at section 2 below.

-- 1. Admins ---------------------------------------------------------------
-- Admin rights live only in the database. Nobody can add themselves here:
-- RLS is on and there are no policies, so only the SQL editor can write it.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Admin accounts (edit the list; only existing auth users are added) ----
insert into public.admins (user_id)
select id from auth.users
where lower(email) in ('valeri@atelier.ge', 'valeri.gelovani@yahoo.com', 'admin@atelier.ge')
on conflict do nothing;

-- 3. New columns that tie rows to the signed-in user -----------------------
alter table public.orders   add column if not exists user_id uuid default auth.uid();
alter table public.messages add column if not exists user_id uuid default auth.uid();
alter table public.messages add column if not exists sender_name text;

-- 4. Remove any old (possibly "allow everything") policies -----------------
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('products', 'orders', 'messages', 'profiles')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.messages enable row level security;
alter table public.profiles enable row level security;

-- 5. Products: everyone can read, only admins can change -------------------
create policy products_read on public.products
  for select using (true);
create policy products_admin_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. Orders: customers see only their own; guests can place but not read ----
create policy orders_read on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy orders_insert on public.orders
  for insert to anon, authenticated with check (
    user_id is not distinct from auth.uid()
    and (user_email is null or lower(user_email) = lower(auth.jwt() ->> 'email'))
    and status = 'მუშავდება'
    and id ~ '^ORD-[0-9]+$'
  );
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_delete on public.orders
  for delete to authenticated using (public.is_admin());

-- 7. Messages: each customer has a private thread with the store ------------
create policy messages_read on public.messages
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy messages_customer_insert on public.messages
  for insert to authenticated with check (user_id = auth.uid() and sender = 'user');
create policy messages_admin_insert on public.messages
  for insert to authenticated with check (public.is_admin() and sender = 'store');
create policy messages_admin_delete on public.messages
  for delete to authenticated using (public.is_admin());

-- 8. Profiles: users read/edit only their own; role cannot be self-assigned -
create policy profiles_read on public.profiles
  for select to authenticated using (id::text = auth.uid()::text or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id::text = auth.uid()::text)
  with check (id::text = auth.uid()::text);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (name, phone, city, address) on public.profiles to authenticated;

-- Profile row is created by the server on sign-up from the signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, city, address, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'city', 'თბილისი'),
    coalesce(new.raw_user_meta_data ->> 'address', ''),
    'customer'
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
