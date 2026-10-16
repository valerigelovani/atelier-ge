-- ATELIER.GE — editable home page content (admin panel → "მთავარი გვერდი").
-- Run once in Supabase Dashboard → SQL Editor. Safe to run again.
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;

drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content
  for select using (true);

drop policy if exists site_content_admin_write on public.site_content;
create policy site_content_admin_write on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
