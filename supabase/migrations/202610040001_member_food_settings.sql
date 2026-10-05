begin;
-- Additive storage for a future authenticated integration. Existing restrictions stay intact.
alter table public.household_members
  add column if not exists display_name text,
  add column if not exists food_rules text[] not null default '{}',
  add column if not exists other_food_exclusions text[] not null default '{}',
  add column if not exists egg_allowed boolean,
  add column if not exists dairy_allowed boolean,
  add column if not exists likes text[] not null default '{}',
  add column if not exists dislikes text[] not null default '{}',
  add column if not exists flavors text[] not null default '{}',
  add column if not exists textures text[] not null default '{}',
  add column if not exists cuisines text[] not null default '{}',
  add column if not exists food_note text,
  add column if not exists no_known_food_allergies boolean;
alter table public.households add column if not exists preferred_store_name text;
alter table public.households add column if not exists preferred_store_location text;
alter table public.ingredients
  add column if not exists food_tags text[] not null default '{}',
  add column if not exists gluten_status text not null default 'unknown' check (gluten_status in ('unknown','contains','verified-free')),
  add column if not exists derivative_ids text[] not null default '{}',
  add column if not exists label_verification_source text;
create table if not exists public.member_food_allergies (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.household_members(id) on delete cascade,
  raw_text text not null check (length(trim(raw_text)) between 1 and 80),
  canonical_ids text[] not null default '{}',
  mapping_status text not null default 'pending_confirmation' check (mapping_status in ('pending_confirmation','confirmed','needs_review')),
  confirmed_at timestamptz, created_at timestamptz not null default now(),
  check (mapping_status <> 'confirmed' or confirmed_at is not null)
);
create table if not exists public.member_nutrient_interests (
  member_id uuid not null references public.household_members(id) on delete cascade,
  nutrient_id text not null check (nutrient_id in ('protein','iron','potassium','fiber','vitamin_d','vitamin_b12')),
  reason text not null check (reason in ('food_ideas','clinician_recommended','unsure')),
  caregiver_reported boolean not null default false,
  review_status text not null default 'pending_confirmation' check (review_status in ('pending_confirmation','confirmed','needs_review')),
  active boolean not null default true,
  primary key (member_id,nutrient_id)
);
alter table public.member_health_context
  add column if not exists medical_conditions text[] not null default '{}',
  add column if not exists potassium_check text not null default 'unknown' check (potassium_check in ('unknown','no_restriction_reported','clinician_recommended'));
alter table public.member_food_allergies enable row level security;
alter table public.member_nutrient_interests enable row level security;
grant select, insert, update, delete on public.member_food_allergies, public.member_nutrient_interests to authenticated;
create policy member_owner on public.member_food_allergies for all to authenticated
  using (exists (select 1 from public.household_members m join public.households h on h.id=m.household_id where m.id=member_id and h.owner_user_id=(select auth.uid())))
  with check (exists (select 1 from public.household_members m join public.households h on h.id=m.household_id where m.id=member_id and h.owner_user_id=(select auth.uid())));
create policy member_owner on public.member_nutrient_interests for all to authenticated
  using (exists (select 1 from public.household_members m join public.households h on h.id=m.household_id where m.id=member_id and h.owner_user_id=(select auth.uid())))
  with check (exists (select 1 from public.household_members m join public.households h on h.id=m.household_id where m.id=member_id and h.owner_user_id=(select auth.uid())));
create trigger food_allergy_changed after insert or update or delete on public.member_food_allergies for each row execute function public.bump_household_from_child();
create trigger nutrient_interest_changed after insert or update or delete on public.member_nutrient_interests for each row execute function public.bump_household_from_child();
commit;
