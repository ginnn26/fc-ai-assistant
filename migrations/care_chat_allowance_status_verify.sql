-- Fictional data only. Rollback keeps the database unchanged after verification.
begin;
do $$
declare
  m text := repeat('c',64);
  mon text := to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur','YYYY-MM');
  result jsonb;
begin
  if has_function_privilege('anon','public.fc_chat_allowance(text,text)','EXECUTE') or
     has_function_privilege('authenticated','public.fc_chat_allowance(text,text)','EXECUTE') then
    raise exception 'allowance_public_access_not_blocked';
  end if;
  if exists(select 1 from care_private.monthly_usage where member=m) or
     exists(select 1 from care_private.wallets where member=m) then
    raise exception 'fixture_collision';
  end if;
  result := public.fc_chat_allowance(m,mon);
  if result <> jsonb_build_object('usedSen',0,'paidRemainingSen',0) then
    raise exception 'new_account_status_failed';
  end if;
  if exists(select 1 from care_private.monthly_usage where member=m) or
     exists(select 1 from care_private.wallets where member=m) then
    raise exception 'status_created_rows';
  end if;
  insert into care_private.monthly_usage(member,month,used_sen) values(m,mon,15);
  insert into care_private.wallets(member,balance_sen) values(m,20);
  result := public.fc_chat_allowance(m,mon);
  result := public.fc_chat_allowance(m,mon);
  if result <> jsonb_build_object('usedSen',15,'paidRemainingSen',20) or
     (select used_sen from care_private.monthly_usage where member=m and month=mon) <> 15 or
     (select balance_sen from care_private.wallets where member=m) <> 20 or
     exists(select 1 from care_private.reservations where member=m) then
    raise exception 'status_mutated_usage';
  end if;
end;
$$;
select 'PASS: private read-only allowance; repeated queries do not create rows or use sends' as verification;
rollback;
