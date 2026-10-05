begin;
-- Publish only independently reviewed quantities with the matching preparation state.
create table public.ingredient_nutrients (
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  nutrient_id text not null check (nutrient_id in ('carbohydrate','protein','iron','potassium','fiber','vitamin_d','vitamin_b12')),
  food_state text not null check (food_state in ('dry','ready-to-eat','raw','cooked')),
  amount_per_100g numeric(12,5) not null check (amount_per_100g >= 0),
  unit text not null check (unit in ('g','mg','mcg')),
  source_name text not null check (length(trim(source_name)) > 0),
  source_record_id text not null check (length(trim(source_record_id)) > 0),
  reviewed_at timestamptz not null,
  primary key (ingredient_id,nutrient_id,food_state,source_record_id)
);
alter table public.ingredient_nutrients enable row level security;
grant select on public.ingredient_nutrients to anon, authenticated;
create policy reviewed_nutrient_read on public.ingredient_nutrients for select to anon, authenticated
  using (exists (select 1 from public.ingredients i where i.id=ingredient_id and i.review_status in ('reviewed','published') and i.reviewed_at is not null));
commit;
