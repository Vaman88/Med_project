begin;

-- Server-derived versions cannot be overwritten by ordinary profile updates.
create function public.version_household() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.profile_version := 1; new.pantry_version := 1;
  elsif pg_trigger_depth() = 1 then
    new.pantry_version := old.pantry_version;
    new.profile_version := old.profile_version;
    if (to_jsonb(new) - array['profile_version','pantry_version','created_at'])
       is distinct from (to_jsonb(old) - array['profile_version','pantry_version','created_at']) then
      new.profile_version := old.profile_version + 1;
    end if;
  end if;
  return new;
end $$;
create trigger version_household before insert or update on public.households
  for each row execute function public.version_household();

create function public.invalidate_household_plans() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.profile_version <> old.profile_version or new.pantry_version <> old.pantry_version then
    update public.meal_plans set status = 'invalidated', cost_status = 'incomplete', estimated_total_cents = null
    where household_id = new.id;
  end if;
  return new;
end $$;
create trigger invalidate_household_plans after update on public.households
  for each row execute function public.invalidate_household_plans();

create function public.bump_household_from_child() returns trigger language plpgsql set search_path = '' as $$
declare old_household uuid; new_household uuid; old_member uuid; new_member uuid;
begin
  if tg_table_name in ('pantry_items', 'household_members') then
    if tg_op <> 'INSERT' then old_household := old.household_id; end if;
    if tg_op <> 'DELETE' then new_household := new.household_id; end if;
  else
    if tg_op <> 'INSERT' then old_member := old.member_id; end if;
    if tg_op <> 'DELETE' then new_member := new.member_id; end if;
    select household_id into old_household from public.household_members where id = old_member;
    select household_id into new_household from public.household_members where id = new_member;
  end if;
  if tg_table_name = 'pantry_items' then
    update public.households set pantry_version = pantry_version + 1 where id = old_household or id = new_household;
  else
    update public.households set profile_version = profile_version + 1 where id = old_household or id = new_household;
  end if;
  return null;
end $$;
create trigger pantry_changed after insert or update or delete on public.pantry_items
  for each row execute function public.bump_household_from_child();
create trigger member_changed after insert or update or delete on public.household_members
  for each row execute function public.bump_household_from_child();
create trigger restriction_changed after insert or update or delete on public.member_restrictions
  for each row execute function public.bump_household_from_child();
create trigger health_context_changed after insert or update or delete on public.member_health_context
  for each row execute function public.bump_household_from_child();

-- These functions are trigger-only, invoker-rights, and have no public RPC access.
revoke execute on function public.version_household() from public, anon, authenticated;
revoke execute on function public.invalidate_household_plans() from public, anon, authenticated;
revoke execute on function public.bump_household_from_child() from public, anon, authenticated;
commit;
