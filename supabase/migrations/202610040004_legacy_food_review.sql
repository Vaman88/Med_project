begin;
-- Keep legacy values in place while making them visible in the new food settings.
update public.household_members m set food_rules = array(
  select distinct value from unnest(m.food_rules || m.dietary_preferences) as choices(value)
  where value = any(array['vegetarian','vegan','pescatarian','exclude_beef','exclude_pork','gluten_free','dairy_free'])
);
insert into public.member_food_allergies (member_id, raw_text, mapping_status)
select r.member_id, left(coalesce(i.canonical_name, r.ingredient_category), 80), 'needs_review'
from public.member_restrictions r
left join public.ingredients i on i.id = r.ingredient_id
where r.restriction_type = 'allergy'
  and coalesce(i.canonical_name, r.ingredient_category) is not null
  and not exists (
    select 1 from public.member_food_allergies a
    where a.member_id = r.member_id and lower(trim(a.raw_text)) = lower(trim(coalesce(i.canonical_name, r.ingredient_category)))
  );
commit;
