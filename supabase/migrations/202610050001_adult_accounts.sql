-- Adult account onboarding and private saved planning state.
create table public.adult_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 60),
  city text not null check (char_length(trim(city)) between 2 and 80),
  state text not null check (state = any(string_to_array('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY', ' '))),
  age integer not null check (age between 18 and 120),
  food_profile jsonb not null check (jsonb_typeof(food_profile) = 'object'),
  pantry jsonb not null default '[]' check (jsonb_typeof(pantry) = 'array'),
  updated_at timestamptz not null default now()
);
create table public.account_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null check (terms_version = 'healthy-steps-2026-10-05'),
  signature text not null check (char_length(trim(signature)) between 2 and 60),
  accepted_at timestamptz not null default now(),
  primary key (user_id, terms_version)
);
alter table public.adult_accounts enable row level security;
alter table public.account_consents enable row level security;
create policy adult_accounts_owner_read on public.adult_accounts for select to authenticated using (user_id = auth.uid());
create policy adult_accounts_owner_update on public.adult_accounts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy account_consents_owner_read on public.account_consents for select to authenticated using (user_id = auth.uid());
revoke all on public.adult_accounts, public.account_consents from anon, authenticated;
grant select on public.adult_accounts, public.account_consents to authenticated;
grant update(food_profile, pantry, updated_at) on public.adult_accounts to authenticated;

-- One transaction writes the account and its server-timestamped consent receipt.
create function public.complete_adult_account(p_name text, p_city text, p_state text, p_age integer, p_profile jsonb, p_signature text, p_terms_version text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in first'; end if;
  if p_terms_version <> 'healthy-steps-2026-10-05' or lower(trim(p_signature)) <> lower(trim(p_name)) then raise exception 'A matching signature and current terms are required'; end if;
  insert into public.adult_accounts(user_id,full_name,city,state,age,food_profile)
  values(owner_id,trim(p_name),trim(p_city),p_state,p_age,p_profile) on conflict(user_id) do nothing;
  insert into public.account_consents(user_id,terms_version,signature)
  values(owner_id,p_terms_version,trim(p_signature)) on conflict(user_id,terms_version) do nothing;
end $$;
revoke all on function public.complete_adult_account(text,text,text,integer,jsonb,text,text) from public;
grant execute on function public.complete_adult_account(text,text,text,integer,jsonb,text,text) to authenticated;

create function public.delete_my_healthy_steps_account()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_healthy_steps_account() from public;
grant execute on function public.delete_my_healthy_steps_account() to authenticated;
