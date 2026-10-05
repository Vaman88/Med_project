-- Apply to a fresh Supabase project. No content is represented as reviewed here.
begin;

create type public.measure_unit as enum ('g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'each');
create type public.content_status as enum ('draft', 'reviewed', 'published', 'archived');

create table public.stores (
  id uuid primary key default gen_random_uuid(), name text not null,
  location_label text not null, zip_code text check (zip_code ~ '^\d{5}$'),
  official_url text check (official_url ~ '^https://'),
  review_status public.content_status not null default 'draft', reviewed_at timestamptz,
  check (review_status not in ('reviewed', 'published') or reviewed_at is not null)
);
create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  household_size integer not null check (household_size > 0),
  weekly_budget_cents integer not null check (weekly_budget_cents >= 0),
  zip_code text check (zip_code ~ '^\d{5}$'), state text check (state ~ '^[A-Z]{2}$'),
  preferred_store_id uuid references public.stores(id) on delete set null,
  equipment text[] not null default '{}',
  display_preferences jsonb not null default '{"hide_bmi":true,"hide_calories":true,"hide_weight":true}',
  meals_covered jsonb not null default '{"days":7,"breakfast":true,"lunch":true,"dinner":true,"snacks":false}',
  food_preferences text[] not null default '{}', cooking_confidence text not null default 'beginner'
    check (cooking_confidence in ('beginner', 'intermediate', 'confident')),
  available_minutes integer not null default 30 check (available_minutes > 0),
  profile_version bigint not null default 1 check (profile_version > 0),
  pantry_version bigint not null default 1 check (pantry_version > 0),
  created_at timestamptz not null default now(),
  check (jsonb_typeof(display_preferences) = 'object'), check (jsonb_typeof(meals_covered) = 'object')
);
create table public.household_members (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  age_group text not null check (age_group in ('under_2', 'child', 'teen', 'adult')),
  activity_level text check (activity_level in ('low', 'moderate', 'high', 'prefer_not_to_answer')),
  activity_frequency text, activity_duration_band text,
  dietary_preferences text[] not null default '{}'
);
create table public.ingredients (
  id uuid primary key default gen_random_uuid(), canonical_name text not null unique,
  aliases text[] not null default '{}', allergen_tags text[] not null default '{}',
  allergen_information_complete boolean not null default false,
  base_unit public.measure_unit not null, optional_fdc_id bigint check (optional_fdc_id > 0),
  review_status public.content_status not null default 'draft', reviewed_at timestamptz,
  check (review_status not in ('reviewed', 'published') or reviewed_at is not null)
);
create table public.member_restrictions (
  id uuid primary key default gen_random_uuid(), member_id uuid not null references public.household_members(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id), ingredient_category text,
  restriction_type text not null check (restriction_type in ('allergy', 'dietary', 'clinician_prescribed', 'preference')),
  notes text, check (num_nonnulls(ingredient_id, ingredient_category) = 1),
  check (ingredient_category is null or length(trim(ingredient_category)) > 0)
);
create table public.member_health_context (
  id uuid primary key default gen_random_uuid(), member_id uuid not null unique references public.household_members(id) on delete cascade,
  optional_family_history text[] not null default '{}', optional_clinician_notes text,
  consent_version text not null check (length(trim(consent_version)) > 0), consented_at timestamptz not null default now()
);
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id), quantity numeric(14,4) not null check (quantity >= 0),
  unit public.measure_unit not null, food_state text not null check (food_state in ('raw', 'cooked', 'packaged', 'unknown')),
  expiry_date date, quantity_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.recipes (
  id uuid primary key default gen_random_uuid(), title text not null,
  yield_servings numeric(8,2) not null check (yield_servings > 0), equipment text[] not null default '{}',
  prep_minutes integer not null check (prep_minutes >= 0), cook_minutes integer not null check (cook_minutes >= 0),
  steps text[] not null check (cardinality(steps) > 0), source_url text not null check (source_url ~ '^https://'),
  permission_notes text not null, allergen_tags text[] not null default '{}',
  review_status public.content_status not null default 'draft', reviewed_at timestamptz,
  check (review_status not in ('reviewed', 'published') or reviewed_at is not null)
);
create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(14,4) not null check (quantity > 0), unit public.measure_unit not null,
  food_state text not null check (food_state in ('raw', 'cooked', 'packaged', 'unknown')),
  optional boolean not null default false, reviewed_substitution_group text,
  primary key (recipe_id, ingredient_id)
);
create table public.price_observations (
  id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
  ingredient_id uuid not null references public.ingredients(id), product_name text not null,
  package_quantity numeric(14,4) not null check (package_quantity > 0), package_unit public.measure_unit not null,
  price_cents integer not null check (price_cents >= 0), observed_at timestamptz not null,
  source_type text not null check (source_type in ('user', 'receipt', 'shelf', 'reviewed_store', 'synthetic_demo')),
  owner_user_id uuid references auth.users(id) on delete cascade,
  is_demo boolean not null default false, review_status public.content_status not null default 'draft', reviewed_at timestamptz,
  check (review_status not in ('reviewed', 'published') or reviewed_at is not null),
  check (is_demo = (source_type = 'synthetic_demo')),
  check (owner_user_id is null or review_status = 'draft')
);
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null, status text not null default 'draft' check (status in ('draft', 'saved', 'invalidated')),
  profile_version bigint not null check (profile_version > 0), pantry_version bigint not null check (pantry_version > 0),
  cost_status text not null default 'incomplete' check (cost_status in ('incomplete', 'estimated_within_budget', 'over_budget')),
  estimated_total_cents integer check (estimated_total_cents >= 0),
  taxes_and_fees_cents integer not null default 0 check (taxes_and_fees_cents >= 0),
  uncertainty_buffer_cents integer not null default 0 check (uncertainty_buffer_cents >= 0),
  created_at timestamptz not null default now()
);
create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.meal_plans(id) on delete cascade,
  day smallint not null check (day between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id uuid not null references public.recipes(id), planned_servings numeric(8,2) not null check (planned_servings > 0),
  batch_id uuid, is_batch_cook boolean not null default true,
  check (is_batch_cook or batch_id is not null)
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.meal_plans(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id), required_quantity numeric(14,4) not null check (required_quantity >= 0),
  unit public.measure_unit not null, package_count integer check (package_count >= 0),
  price_observation_id uuid references public.price_observations(id), purchased boolean not null default false,
  unique (plan_id, ingredient_id, unit)
);
create table public.video_resources (
  id uuid primary key default gen_random_uuid(), title text not null, publisher text not null,
  source_url text not null check (source_url ~ '^https://'), embed_url text check (embed_url ~ '^https://'),
  embedding_allowed boolean not null default false, topic text not null check (topic in ('cooking_skills', 'food_education', 'eating_support')),
  age_group text not null, transcript_url text check (transcript_url ~ '^https://'),
  reviewed_at timestamptz, active boolean not null default false,
  review_status public.content_status not null default 'draft',
  check (review_status not in ('reviewed', 'published') or reviewed_at is not null),
  check (embed_url is null or embedding_allowed)
);
create table public.food_resources (
  id uuid primary key default gen_random_uuid(), name text not null,
  resource_type text not null check (resource_type in ('pantry', 'food_bank_locator', 'snap', 'application_help', 'low_cost_grocery', 'support')),
  address text, state text check (state ~ '^[A-Z]{2}$'), postal_code text check (postal_code ~ '^\d{5}$'),
  phone text, official_url text not null check (official_url ~ '^https://'), source_url text not null check (source_url ~ '^https://'),
  hours_notes text, requirements_notes text, verified_at timestamptz,
  review_status public.content_status not null default 'draft', active boolean not null default false,
  check (review_status not in ('reviewed', 'published') or verified_at is not null)
);

-- Each ownership lookup uses invoker rights: the parent table's RLS also applies.
-- Both USING and WITH CHECK prevent moving a child to another household on UPDATE.
do $$
declare t text;
begin
  foreach t in array array['households','household_members','member_restrictions','member_health_context','pantry_items','ingredients','recipes','recipe_ingredients','stores','price_observations','meal_plans','meal_plan_entries','shopping_items','video_resources','food_resources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  foreach t in array array['households','household_members','member_restrictions','member_health_context','pantry_items','meal_plans','meal_plan_entries','shopping_items'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array array['ingredients','recipes','recipe_ingredients','stores','price_observations','video_resources','food_resources'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

create policy household_owner on public.households for all to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['household_members','pantry_items','meal_plans'] loop
    execute format('create policy household_owner on public.%I for all to authenticated using (exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.households h where h.id = household_id and h.owner_user_id = (select auth.uid())))', t);
  end loop;
  foreach t in array array['member_restrictions','member_health_context'] loop
    execute format('create policy member_owner on public.%I for all to authenticated using (exists (select 1 from public.household_members m join public.households h on h.id = m.household_id where m.id = member_id and h.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.household_members m join public.households h on h.id = m.household_id where m.id = member_id and h.owner_user_id = (select auth.uid())))', t);
  end loop;
  foreach t in array array['meal_plan_entries','shopping_items'] loop
    execute format('create policy plan_owner on public.%I for all to authenticated using (exists (select 1 from public.meal_plans p join public.households h on h.id = p.household_id where p.id = plan_id and h.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.meal_plans p join public.households h on h.id = p.household_id where p.id = plan_id and h.owner_user_id = (select auth.uid())))', t);
  end loop;
  foreach t in array array['ingredients','recipes','stores'] loop
    execute format('create policy approved_read on public.%I for select to anon, authenticated using (review_status in (''reviewed'', ''published'') and reviewed_at is not null)', t);
  end loop;
end $$;
create policy approved_recipe_ingredients on public.recipe_ingredients for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id) and exists (select 1 from public.ingredients i where i.id = ingredient_id));
create policy published_videos on public.video_resources for select to anon, authenticated
  using (active and review_status = 'published' and reviewed_at is not null);
create policy published_resources on public.food_resources for select to anon, authenticated
  using (active and review_status = 'published' and verified_at is not null);
create policy approved_prices on public.price_observations for select to anon, authenticated
  using (owner_user_id is null and review_status in ('reviewed', 'published') and reviewed_at is not null);
grant insert, update, delete on public.price_observations to authenticated;
create policy own_prices on public.price_observations for all to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()) and review_status = 'draft' and not is_demo and source_type in ('user', 'receipt', 'shelf'));

create index on public.household_members(household_id);
create index on public.member_restrictions(member_id);
create index on public.pantry_items(household_id);
create index on public.meal_plans(household_id);
create index on public.meal_plan_entries(plan_id);
create index on public.shopping_items(plan_id);
create index on public.price_observations(owner_user_id);
create index on public.food_resources(state, postal_code);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ingredient-photos', 'ingredient-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Object paths: <auth-user-id>/<household-id>/<random-id>.<extension>.
-- No UUID cast of untrusted paths: malformed folder names fail equality safely.
create policy ingredient_photo_owner on storage.objects for all to authenticated
  using (bucket_id = 'ingredient-photos' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (select 1 from public.households h where h.id::text = (storage.foldername(name))[2] and h.owner_user_id = (select auth.uid())))
  with check (bucket_id = 'ingredient-photos' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (select 1 from public.households h where h.id::text = (storage.foldername(name))[2] and h.owner_user_id = (select auth.uid())));

commit;
