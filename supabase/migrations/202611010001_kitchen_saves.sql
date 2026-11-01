-- Standalone setup for the current guest-first planner.
-- Run this file in the Supabase SQL Editor for project isvxgxztiayqzkbvrkia.
-- No legacy migrations are required for this feature.
begin;

create table if not exists public.kitchen_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kitchen jsonb not null,
  updated_at timestamptz not null default now(),
  constraint kitchen_saves_valid_document check (
    jsonb_typeof(kitchen) = 'object'
    and kitchen->>'version' = '1'
    and jsonb_typeof(kitchen->'profile') = 'object'
    and jsonb_typeof(kitchen->'foods') = 'array'
    and octet_length(kitchen::text) <= 100000
    and kitchen ?& array['version', 'profile', 'foods']
  )
);

alter table public.kitchen_saves enable row level security;
revoke all on public.kitchen_saves from anon;
revoke all on public.kitchen_saves from authenticated;
grant select, insert, update, delete on public.kitchen_saves to authenticated;

drop policy if exists "Kitchen owners read" on public.kitchen_saves;
create policy "Kitchen owners read" on public.kitchen_saves
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Kitchen owners insert" on public.kitchen_saves;
create policy "Kitchen owners insert" on public.kitchen_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Kitchen owners update" on public.kitchen_saves;
create policy "Kitchen owners update" on public.kitchen_saves
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Kitchen owners delete" on public.kitchen_saves;
create policy "Kitchen owners delete" on public.kitchen_saves
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
