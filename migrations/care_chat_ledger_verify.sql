-- Synthetic fixtures only. The entire transaction rolls back; no customer data.
begin;
do $$
declare
  m text := repeat('f',64);
  mon text := to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur','YYYY-MM');
  result jsonb;
  rid uuid := gen_random_uuid();
  n integer;
begin
  if exists(select 1 from care_private.monthly_usage where member=m) or
     exists(select 1 from care_private.wallets where member=m) then
    raise exception 'verification_fixture_collision';
  end if;
  if has_schema_privilege('anon','care_private','USAGE') or
     has_schema_privilege('authenticated','care_private','USAGE') or
     has_function_privilege('anon','public.fc_reserve_chat(text,text,integer,integer,uuid)','EXECUTE') or
     has_function_privilege('authenticated','public.fc_credit_chat(text,text,text,integer)','EXECUTE') then
    raise exception 'public_access_not_blocked';
  end if;
  for n in 1..100 loop
    result := public.fc_reserve_chat(m,mon,5,500,gen_random_uuid());
    if result->>'accepted' <> 'true' or (result->>'usedSen')::integer <> n*5 then
      raise exception 'reservation_count_failed';
    end if;
  end loop;
  result := public.fc_reserve_chat(m,mon,5,500,gen_random_uuid());
  if result->>'accepted' <> 'false' then raise exception 'monthly_cap_failed'; end if;
  insert into care_private.orders(id,member,merchant_id,product_id,price_sen,currency)
    values('synthetic-ledger-verification',m,'synthetic-merchant','fc-care-chat-extra-v1',1000,'MYR');
  for n in 1..12 loop
    result := public.fc_credit_chat(repeat('e',64),'synthetic-ledger-verification',m,500);
  end loop;
  if (select balance_sen from care_private.wallets where member=m) <> 500 then
    raise exception 'duplicate_payment_credited';
  end if;
  result := public.fc_reserve_chat(m,mon,5,500,rid);
  if (result->>'usedSen')::integer <> 500 or (result->>'paidRemainingSen')::integer <> 495 then
    raise exception 'paid_allowance_failed';
  end if;
  result := public.fc_reserve_chat(m,mon,5,500,rid);
  if (result->>'paidRemainingSen')::integer <> 495 then raise exception 'duplicate_request_charged'; end if;
  result := public.fc_reserve_chat(repeat('d',64),mon,5,500,gen_random_uuid());
  if (result->>'usedSen')::integer <> 5 or (result->>'paidRemainingSen')::integer <> 0 then
    raise exception 'member_isolation_failed';
  end if;
end;
$$;
select 'PASS: permissions, RM5 cap, paid allowance, payment/request deduplication, member isolation' as verification;
rollback;
