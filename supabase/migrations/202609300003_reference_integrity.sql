begin;

-- PostgreSQL numeric accepts NaN, which must never become a pantry/planning fact.
alter table public.pantry_items add check (quantity <> 'NaN'::numeric);
alter table public.recipes add check (yield_servings <> 'NaN'::numeric);
alter table public.recipe_ingredients add check (quantity <> 'NaN'::numeric);
alter table public.price_observations add check (package_quantity <> 'NaN'::numeric);
alter table public.meal_plan_entries add check (planned_servings <> 'NaN'::numeric);
alter table public.shopping_items add check (required_quantity <> 'NaN'::numeric);

-- Referencing another caregiver's private price must also be denied, even if
-- the caller knows its UUID. Ordinary FK checks alone bypass row visibility.
create policy visible_shopping_price_insert on public.shopping_items as restrictive for insert to authenticated
  with check (price_observation_id is null or exists (
    select 1 from public.price_observations p
    where p.id = price_observation_id and p.ingredient_id = shopping_items.ingredient_id
  ));
create policy visible_shopping_price_update on public.shopping_items as restrictive for update to authenticated
  with check (price_observation_id is null or exists (
    select 1 from public.price_observations p
    where p.id = price_observation_id and p.ingredient_id = shopping_items.ingredient_id
  ));
create policy visible_recipe_insert on public.meal_plan_entries as restrictive for insert to authenticated
  with check (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy visible_recipe_update on public.meal_plan_entries as restrictive for update to authenticated
  with check (exists (select 1 from public.recipes r where r.id = recipe_id));

commit;
