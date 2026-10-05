begin;
alter table public.household_members add column client_key text;
update public.household_members set client_key = id::text where client_key is null;
alter table public.household_members alter column client_key set not null;
alter table public.household_members add constraint member_client_key_length check (length(client_key) between 1 and 80);
create unique index household_member_client_key on public.household_members(household_id, client_key);
commit;
