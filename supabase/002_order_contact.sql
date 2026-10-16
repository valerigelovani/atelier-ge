-- ATELIER.GE — customer name and phone on orders (so the courier can call).
-- Run once in Supabase Dashboard → SQL Editor. Safe to run again.
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists phone text;
