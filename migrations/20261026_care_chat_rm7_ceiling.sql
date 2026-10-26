-- Preserve all existing usage, reservations, purchased balances and payment rules.
-- Apply together with the matching backend release, before enabling Care Chat.
begin;
alter table care_private.monthly_usage drop constraint monthly_usage_used_sen_check;
alter table care_private.monthly_usage add constraint monthly_usage_used_sen_check check (used_sen between 0 and 700);
create or replace function public.fc_reserve_chat(
  p_member text, p_month text, p_amount_sen integer, p_limit_sen integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_used integer;
  v_paid integer;
  v_existing care_private.reservations%rowtype;
  v_funding text;
begin
  if p_member is null or p_member !~ '^[a-f0-9]{64}$' or p_request_id is null or
     p_amount_sen is distinct from 5 or p_limit_sen is distinct from 700 or
     p_month is distinct from to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur','YYYY-MM') then
    raise exception 'invalid_reservation';
  end if;
  insert into care_private.monthly_usage(member,month) values(p_member,p_month) on conflict do nothing;
  select used_sen into v_used from care_private.monthly_usage
    where member=p_member and month=p_month for update;
  insert into care_private.wallets(member) values(p_member) on conflict do nothing;
  select balance_sen into v_paid from care_private.wallets where member=p_member for update;
  select * into v_existing from care_private.reservations where request_id=p_request_id;
  if found then
    if v_existing.member <> p_member or v_existing.month <> p_month then
      raise exception 'reservation_conflict';
    end if;
    return jsonb_build_object('accepted',true,'usedSen',v_used,'paidRemainingSen',v_paid);
  end if;
  if v_used + p_amount_sen <= p_limit_sen then
    v_used := v_used + p_amount_sen;
    update care_private.monthly_usage set used_sen=v_used where member=p_member and month=p_month;
    v_funding := 'included';
  elsif v_paid >= p_amount_sen then
    v_paid := v_paid - p_amount_sen;
    update care_private.wallets set balance_sen=v_paid where member=p_member;
    v_funding := 'purchased';
  else
    return jsonb_build_object('accepted',false,'usedSen',v_used,'paidRemainingSen',v_paid);
  end if;
  insert into care_private.reservations(request_id,member,month,amount_sen,funding)
    values(p_request_id,p_member,p_month,p_amount_sen,v_funding);
  return jsonb_build_object('accepted',true,'usedSen',v_used,'paidRemainingSen',v_paid);
end;
$$;


revoke all on function public.fc_reserve_chat(text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.fc_reserve_chat(text,text,integer,integer,uuid) to service_role;
commit;
