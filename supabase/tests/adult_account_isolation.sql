-- Run as postgres in a disposable Supabase database after all migrations.
-- All fixtures are rolled back. Reserved UUIDs must not already exist.
begin;
insert into auth.users(id,email) values
 ('33333333-3333-4333-8333-333333333333','adult-a@example.invalid'),
 ('44444444-4444-4444-8444-444444444444','adult-b@example.invalid');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select public.complete_adult_account('Adult A','Austin','TX',30,'{}','Adult A','healthy-steps-2026-10-05');
do $$ begin
  if (select count(*) from public.adult_accounts) <> 1 then raise exception 'Account setup failed'; end if;
  if (select count(*) from public.account_consents) <> 1 then raise exception 'Consent setup failed'; end if;
  begin
    update public.account_consents set signature='Changed';
    raise exception 'Consent receipt was editable';
  exception when insufficient_privilege then null; end;
  begin
    update public.adult_accounts set full_name='Changed';
    raise exception 'Signed account identity was editable';
  exception when insufficient_privilege then null; end;
  begin
    perform public.complete_adult_account('Adult A','Austin','TX',30,'{}','Wrong','healthy-steps-2026-10-05');
    raise exception 'Mismatched signature was accepted';
  exception when raise_exception then
    if sqlerrm = 'Mismatched signature was accepted' then raise; end if;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
select public.complete_adult_account('Adult B','Boston','MA',40,'{}','Adult B','healthy-steps-2026-10-05');
do $$ declare affected integer; begin
  if (select count(*) from public.adult_accounts) <> 1 then raise exception 'Account read isolation failed'; end if;
  if (select count(*) from public.account_consents) <> 1 then raise exception 'Consent read isolation failed'; end if;
  update public.adult_accounts set pantry='[{}]' where user_id='33333333-3333-4333-8333-333333333333';
  get diagnostics affected=row_count;
  if affected <> 0 then raise exception 'Cross-account pantry update succeeded'; end if;
  update public.adult_accounts set pantry='[]' where user_id=auth.uid();
  get diagnostics affected=row_count;
  if affected <> 1 then raise exception 'Own pantry update failed'; end if;
end $$;
select public.delete_my_healthy_steps_account();
reset role;
do $$ begin
  if exists(select 1 from auth.users where id='44444444-4444-4444-8444-444444444444') then raise exception 'Auth account deletion failed'; end if;
  if exists(select 1 from public.adult_accounts where user_id='44444444-4444-4444-8444-444444444444') then raise exception 'Saved data deletion failed'; end if;
  if exists(select 1 from public.account_consents where user_id='44444444-4444-4444-8444-444444444444') then raise exception 'Consent deletion failed'; end if;
  if not exists(select 1 from auth.users where id='33333333-3333-4333-8333-333333333333') then raise exception 'Deleted another account'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform * from public.adult_accounts;
    raise exception 'Anonymous account read succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.delete_my_healthy_steps_account();
    raise exception 'Anonymous account deletion succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
