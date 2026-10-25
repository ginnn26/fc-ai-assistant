begin;
create schema if not exists care_private;
revoke all on schema care_private from public, anon, authenticated;

create table if not exists care_private.monthly_usage (
  member text not null check (member ~ '^[a-f0-9]{64}$'),
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  used_sen integer not null default 0 check (used_sen between 0 and 500),
  primary key(member, month)
);
create table if not exists care_private.wallets (
  member text primary key check (member ~ '^[a-f0-9]{64}$'),
  balance_sen integer not null default 0 check (balance_sen >= 0)
);
create table if not exists care_private.reservations (
  request_id uuid primary key,
  member text not null,
  month text not null,
  amount_sen integer not null check (amount_sen = 5),
  funding text not null check (funding in ('included','purchased')),
  created_at timestamptz not null default now()
);
create table if not exists care_private.orders (
  id text primary key check (length(id) between 1 and 128),
  member text not null check (member ~ '^[a-f0-9]{64}$'),
  merchant_id text not null,
  product_id text not null check (product_id = 'fc-care-chat-extra-v1'),
  price_sen integer not null check (price_sen = 1000),
  currency text not null check (currency = 'MYR'),
  status text not null default 'pending' check (status in ('pending','credited','cancelled','refunded')),
  created_at timestamptz not null default now()
);
create table if not exists care_private.payment_credits (
  payment_key text primary key check (payment_key ~ '^[a-f0-9]{64}$'),
  order_id text not null unique references care_private.orders(id),
  member text not null,
  allowance_sen integer not null check (allowance_sen = 500),
  created_at timestamptz not null default now()
);

alter table care_private.monthly_usage enable row level security;
alter table care_private.wallets enable row level security;
alter table care_private.reservations enable row level security;
alter table care_private.orders enable row level security;
alter table care_private.payment_credits enable row level security;
revoke all on all tables in schema care_private from public, anon, authenticated;

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
     p_amount_sen is distinct from 5 or p_limit_sen is distinct from 500 or
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

create or replace function public.fc_credit_chat(
  p_payment_key text, p_order_id text, p_member text, p_allowance_sen integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order care_private.orders%rowtype;
  v_prior care_private.payment_credits%rowtype;
begin
  if p_payment_key is null or p_payment_key !~ '^[a-f0-9]{64}$' or
     p_member is null or p_member !~ '^[a-f0-9]{64}$' or p_allowance_sen is distinct from 500 then
    raise exception 'invalid_credit';
  end if;
  select * into v_order from care_private.orders where id=p_order_id for update;
  if not found or v_order.member<>p_member or v_order.status not in ('pending','credited') then
    raise exception 'order_not_eligible';
  end if;
  -- Serialize delivery of the same payment even when different orders are supplied.
  perform pg_advisory_xact_lock(hashtextextended(p_payment_key,0));
  select * into v_prior from care_private.payment_credits where payment_key=p_payment_key or order_id=p_order_id;
  if found then
    if v_prior.member<>p_member or v_prior.order_id<>p_order_id then raise exception 'payment_conflict'; end if;
    return jsonb_build_object('alreadyCredited',true);
  end if;
  if v_order.status <> 'pending' then raise exception 'order_not_eligible'; end if;
  insert into care_private.payment_credits(payment_key,order_id,member,allowance_sen)
    values(p_payment_key,p_order_id,p_member,p_allowance_sen);
  insert into care_private.wallets(member,balance_sen) values(p_member,p_allowance_sen)
    on conflict(member) do update set balance_sen=care_private.wallets.balance_sen+excluded.balance_sen;
  update care_private.orders set status='credited' where id=p_order_id;
  return jsonb_build_object('credited',true);
end;
$$;

revoke all on function public.fc_reserve_chat(text,text,integer,integer,uuid) from public,anon,authenticated;
revoke all on function public.fc_credit_chat(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.fc_reserve_chat(text,text,integer,integer,uuid) to service_role;
grant execute on function public.fc_credit_chat(text,text,text,integer) to service_role;
commit;
