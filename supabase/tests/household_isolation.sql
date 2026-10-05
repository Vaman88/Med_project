-- Run as postgres against a disposable migrated Supabase database.
-- Uses rollback-only fixtures; does not exercise Storage HTTP downloads.
begin;
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111', 'isolation-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222', 'isolation-b@example.invalid');
insert into public.households (id, owner_user_id, household_size, weekly_budget_cents) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 2, 7500),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 3, 10000);
insert into public.household_members (id, household_id, age_group) values
 ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'adult'),
 ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'adult');
insert into public.member_health_context (member_id, optional_clinician_notes, consent_version) values
 ('aaaaaaaa-0000-4000-8000-000000000001', 'Fixture A private notes', 'test-v1'),
 ('bbbbbbbb-0000-4000-8000-000000000001', 'Fixture B private notes', 'test-v1');
insert into public.meal_plans (household_id, week_start, profile_version, pantry_version)
 select id, '2026-09-28', profile_version, pantry_version from public.households;
insert into public.stores (id, name, location_label, review_status, reviewed_at)
 values ('cccccccc-0000-4000-8000-000000000001', 'Synthetic test store', 'Fixture location', 'reviewed', now());
insert into public.ingredients (id, canonical_name, base_unit, review_status, reviewed_at)
 values ('cccccccc-0000-4000-8000-000000000002', 'Synthetic fixture rice', 'g', 'reviewed', now());
insert into public.price_observations (id, store_id, ingredient_id, product_name, package_quantity, package_unit, price_cents, observed_at, source_type, owner_user_id)
 values ('bbbbbbbb-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000002',
 'B private price', 100, 'g', 100, now(), 'user', '22222222-2222-4222-8222-222222222222');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
declare affected integer; previous_version bigint;
begin
  if (select count(*) from public.households) <> 1 then raise exception 'Household read isolation failed'; end if;
  if (select count(*) from public.household_members) <> 1 then raise exception 'Member read isolation failed'; end if;
  if (select count(*) from public.member_health_context) <> 1 then raise exception 'Health read isolation failed'; end if;
  if (select count(*) from public.meal_plans) <> 1 then raise exception 'Plan read isolation failed'; end if;
  if exists (select 1 from public.price_observations where id = 'bbbbbbbb-0000-4000-8000-000000000002') then
    raise exception 'Private price read isolation failed';
  end if;
  begin
    insert into public.shopping_items (plan_id, ingredient_id, required_quantity, unit, price_observation_id)
      select id, 'cccccccc-0000-4000-8000-000000000002', 10, 'g', 'bbbbbbbb-0000-4000-8000-000000000002' from public.meal_plans;
    raise exception 'Cross-owner private price reference succeeded';
  exception when insufficient_privilege then null; end;
  update public.households set weekly_budget_cents = 1 where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner update succeeded'; end if;
  delete from public.household_members where id = 'bbbbbbbb-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-owner delete succeeded'; end if;
  begin
    insert into public.household_members (household_id, age_group) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'child');
    raise exception 'Cross-owner child insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.household_members set household_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      where id = 'aaaaaaaa-0000-4000-8000-000000000001';
    raise exception 'Child reparenting succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.households set owner_user_id = '22222222-2222-4222-8222-222222222222'
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Owner transfer succeeded';
  exception when insufficient_privilege then null; end;
  select profile_version into previous_version from public.households;
  update public.households set weekly_budget_cents = weekly_budget_cents + 100;
  if (select profile_version from public.households) <> previous_version + 1 then raise exception 'Profile version did not increment'; end if;
  if exists (select 1 from public.meal_plans where status <> 'invalidated') then raise exception 'Saved plan did not invalidate'; end if;
  raise notice 'Household A ownership and profile invalidation checks passed';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.households) <> 1 or
     (select min(owner_user_id::text) from public.households) <> '22222222-2222-4222-8222-222222222222' then
    raise exception 'Household B read isolation failed';
  end if;
  if (select count(*) from public.member_health_context) <> 1 then raise exception 'Household B health isolation failed'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform id from public.households;
    raise exception 'Anonymous private profile read succeeded';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.food_resources where not active or review_status <> 'published' or verified_at is null) then
    raise exception 'Unverified public resource visible';
  end if;
  begin
    insert into public.ingredients (canonical_name, base_unit) values ('forbidden-public-write', 'g');
    raise exception 'Anonymous catalog write succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
