-- PREPARED ONLY. Apply after paid_membership migration and approved staff setup.
begin;
create table care_private.operator_memberships (
 email_hash text primary key check(email_hash ~ '^[a-f0-9]{64}$'),
 email_hint text not null check(length(email_hint) between 3 and 254),
 plan text not null check(plan in ('monthly','half_year','annual')),
 state text not null check(state in ('active','nonrenewing','revoked')),
 paid_from timestamptz not null, paid_until timestamptz not null,
 audio_active_confirmed boolean not null default false,
 audio_checked_at timestamptz,
 version bigint not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 check(paid_until>paid_from)
);
create table care_private.operator_payment_refs (
 reference_hash text primary key check(reference_hash ~ '^[a-f0-9]{64}$'),
 email_hash text not null references care_private.operator_memberships(email_hash),
 reference_hint text not null check(length(reference_hint) between 1 and 6),
 recorded_at timestamptz not null default now()
);
create table care_private.operator_membership_audit (
 request_id uuid primary key,
 actor uuid not null, actor_label text not null,
 email_hash text not null,
 action text not null,
 request_payload jsonb not null,
 before_state jsonb, after_state jsonb not null,
 created_at timestamptz not null default now()
);
create index on care_private.operator_membership_audit(email_hash,created_at desc);
alter table care_private.operator_memberships enable row level security;
alter table care_private.operator_payment_refs enable row level security;
alter table care_private.operator_membership_audit enable row level security;
revoke all on care_private.operator_memberships,care_private.operator_payment_refs,care_private.operator_membership_audit from public,anon,authenticated;

create or replace function public.fc_admin_membership_query(p_email_hash text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare member jsonb; events jsonb;
begin
 if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request'; end if;
 select to_jsonb(m)||jsonb_build_object('chat_active',m.state<>'revoked' and m.paid_from<=now() and now()<m.paid_until)
 into member from care_private.operator_memberships m where m.email_hash=p_email_hash;
 select coalesce(jsonb_agg(e),'[]'::jsonb) into events from (
  select request_id,action,actor_label,created_at,before_state,after_state,request_payload->>'reference_hint' as reference_hint,request_payload->>'approval_hint' as approval_hint
  from care_private.operator_membership_audit where email_hash=p_email_hash order by (after_state->>'version')::bigint desc limit 30
 ) e;
 return jsonb_build_object('member',member,'events',events);
end;$$;

create or replace function public.fc_admin_membership_tasks(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare items jsonb; total bigint;
begin
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'invalid_request'; end if;
 with attention as (
  select *, (state<>'revoked' and paid_from<=now() and now()<paid_until) as expected_audio,
   (state<>'revoked' and now()<paid_until and paid_until<=now()+interval '7 days') as expiring
  from care_private.operator_memberships
 ) select count(*) into total from attention where audio_active_confirmed<>expected_audio or expiring;
 with attention as (
  select *, (state<>'revoked' and paid_from<=now() and now()<paid_until) as expected_audio,
   (state<>'revoked' and now()<paid_until and paid_until<=now()+interval '7 days') as expiring
  from care_private.operator_memberships
 ), page as (
  select email_hash,email_hint,plan,state,paid_from,paid_until,version,updated_at,
   expected_audio as chat_active, audio_active_confirmed, audio_active_confirmed<>expected_audio as audio_pending,expiring
  from attention where audio_active_confirmed<>expected_audio or expiring
  order by (audio_active_confirmed<>expected_audio) desc,paid_until,email_hash limit 50 offset p_offset
 ) select coalesce(jsonb_agg(to_jsonb(page)),'[]'::jsonb) into items from page;
 return jsonb_build_object('items',items,'total',total,'offset',p_offset,'hasMore',p_offset+jsonb_array_length(items)<total);
end;$$;

create or replace function public.fc_admin_membership_save(p_actor uuid,p_actor_label text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old_row care_private.operator_memberships%rowtype; current_row care_private.operator_memberships%rowtype;
 prior care_private.operator_membership_audit%rowtype;
 email text:=p_payload->>'email_hash'; act text:=p_payload->>'action';
 request uuid:=(p_payload->>'request_id')::uuid; expected bigint:=(p_payload->>'expected_version')::bigint;
 before_value jsonb; after_value jsonb; ref text:=p_payload->>'reference_hash'; existing_ref text;
begin
 if p_actor is null or p_actor_label is null or length(p_actor_label) not between 1 and 60
  or email is null or email !~ '^[a-f0-9]{64}$' or request is null or expected is null or expected<0
  or act is null or act not in ('activate','renew','cancel_at_end','revoke','restore','correct','confirm_audio') then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fc-admin-request:'||request::text,0));
 select * into prior from care_private.operator_membership_audit where request_id=request;
 if found then
  if prior.actor<>p_actor or prior.request_payload<>p_payload then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('member',prior.after_state,'replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fc-admin-member:'||email,0));
 select * into old_row from care_private.operator_memberships where email_hash=email for update;
 if coalesce(old_row.version,0)<>expected then raise exception 'revision_conflict'; end if;
 if old_row.email_hash is null and act<>'activate' then raise exception 'invalid_membership_transition'; end if;
 if old_row.email_hash is not null and act='activate' then raise exception 'invalid_membership_transition'; end if;
 if act='cancel_at_end' and old_row.state='revoked' then raise exception 'invalid_membership_transition'; end if;
 if act in ('revoke','restore') and coalesce(p_payload->>'approval_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request'; end if;
 if act='restore' and (old_row.state<>'revoked' or old_row.paid_until<=now()) then raise exception 'invalid_membership_transition'; end if;
 if act='renew' and old_row.state<>'revoked' and old_row.paid_from<=now() and now()<old_row.paid_until then
  if (p_payload->>'paid_until')::timestamptz<=old_row.paid_until or (p_payload->>'paid_from')::timestamptz>now() then raise exception 'invalid_membership_transition'; end if;
 end if;
 before_value:=case when old_row.email_hash is null then null else to_jsonb(old_row) end;
 if act in ('activate','renew','correct') then
  if ref is null or ref !~ '^[a-f0-9]{64}$' or p_payload->>'plan' not in ('monthly','half_year','annual')
   or p_payload->>'paid_from' is null or p_payload->>'paid_until' is null
   or (p_payload->>'paid_until')::timestamptz<=(p_payload->>'paid_from')::timestamptz then raise exception 'invalid_request'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fc-admin-payment:'||ref,0));
  select email_hash into existing_ref from care_private.operator_payment_refs where reference_hash=ref;
  if existing_ref is not null and not (act='correct' and existing_ref=email) then raise exception 'duplicate_payment_reference'; end if;
  insert into care_private.operator_memberships(email_hash,email_hint,plan,state,paid_from,paid_until)
  values(email,p_payload->>'email_hint',p_payload->>'plan','active',(p_payload->>'paid_from')::timestamptz,(p_payload->>'paid_until')::timestamptz)
  on conflict(email_hash) do update set plan=excluded.plan,
   state=case when act='correct' then care_private.operator_memberships.state else 'active' end,
   paid_from=excluded.paid_from,paid_until=excluded.paid_until,version=care_private.operator_memberships.version+1,updated_at=now();
  insert into care_private.operator_payment_refs(reference_hash,email_hash,reference_hint)
  values(ref,email,p_payload->>'reference_hint') on conflict(reference_hash) do nothing;
 else
  if act='confirm_audio' and jsonb_typeof(p_payload->'audio_active') is distinct from 'boolean' then raise exception 'invalid_request'; end if;
  update care_private.operator_memberships set
   state=case when act='cancel_at_end' then 'nonrenewing' when act='revoke' then 'revoked' when act='restore' then 'active' else state end,
   audio_active_confirmed=case when act='confirm_audio' then (p_payload->>'audio_active')::boolean else audio_active_confirmed end,
   audio_checked_at=case when act='confirm_audio' then now() else audio_checked_at end,
   version=version+1,updated_at=now() where email_hash=email;
 end if;
 select * into current_row from care_private.operator_memberships where email_hash=email;
 -- Manual paid coverage is authoritative until the confirmed paid-through date.
 -- No monthly wallet counters are touched by any admin membership operation.
 insert into care_private.paid_memberships(source,source_record,email_hash,paid_from,paid_until,verified_until,revoked)
 values('operator_verified','staff:'||email,email,current_row.paid_from,current_row.paid_until,current_row.paid_until,current_row.state='revoked')
 on conflict(source,source_record) do update set paid_from=excluded.paid_from,paid_until=excluded.paid_until,
  verified_until=excluded.verified_until,revoked=excluded.revoked,updated_at=now();
 after_value:=to_jsonb(current_row)||jsonb_build_object('chat_active',current_row.state<>'revoked' and current_row.paid_from<=now() and now()<current_row.paid_until);
 insert into care_private.operator_membership_audit(request_id,actor,actor_label,email_hash,action,request_payload,before_state,after_state)
 values(request,p_actor,p_actor_label,email,act,p_payload,before_value,after_value);
 return jsonb_build_object('member',after_value,'replayed',false);
end;$$;
revoke all on function public.fc_admin_membership_query(text),public.fc_admin_membership_tasks(integer),public.fc_admin_membership_save(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.fc_admin_membership_query(text),public.fc_admin_membership_tasks(integer),public.fc_admin_membership_save(uuid,text,jsonb) to service_role;
commit;
