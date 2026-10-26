-- Apply before deploying the allowanceStatus UI. Read-only, no deductions or
-- row creation. Only the existing service role may call it; the backend derives
-- p_member from a server-verified identity, never from browser input.
begin;
create or replace function public.fc_chat_allowance(p_member text, p_month text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_used integer; v_paid integer;
begin
  if p_member is null or p_member !~ '^[a-f0-9]{64}$' or
     p_month is distinct from to_char(current_timestamp at time zone 'Asia/Kuala_Lumpur','YYYY-MM') then
    raise exception 'invalid_allowance_query';
  end if;
  select used_sen into v_used from care_private.monthly_usage where member=p_member and month=p_month;
  select balance_sen into v_paid from care_private.wallets where member=p_member;
  return jsonb_build_object('usedSen',coalesce(v_used,0),'paidRemainingSen',coalesce(v_paid,0));
end;
$$;
revoke all on function public.fc_chat_allowance(text,text) from public,anon,authenticated;
grant execute on function public.fc_chat_allowance(text,text) to service_role;
commit;
