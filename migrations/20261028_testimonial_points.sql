begin;
create schema if not exists rewards_private;
revoke all on schema rewards_private from public,anon,authenticated;
create table rewards_private.catalogue (
 id text primary key, points integer not null check(points>0), name_en text not null, name_zh text not null,
 variants jsonb not null default '[]', value_myr integer, physical boolean not null, enabled boolean not null default true
);
insert into rewards_private.catalogue(id,points,name_en,name_zh,variants,value_myr,physical) values
 ('membership-day',50,'1 free membership day','免费会员 1 天','[]',null,false),
 ('gold-lucky-turtle',100,'1 Gold Lucky Turtle','招财金龟 1 只','[]',99,true),
 ('essential-oil-10ml',150,'1 essential oil · 10ml','精油 10ml · 1 瓶','["Stress Away","Good Night"]',198,true),
 ('ritual-tea',180,'1 Ritual Tea packet · 10 sachets','仪式花草茶 · 1 袋（10 小包）','["Calm","Relax","Sleep"]',190,true),
 ('salt-room-60min',200,'1 Energy Salt Room session · 60 minutes','能量盐房疗愈 · 1 次（60 分钟）','[]',190,false),
 ('aura-energy-cleanse-50ml',300,'1 Aura Spray · Energy Cleanse · 50ml','气场喷雾 · 能量净化款 · 50ml','[]',298,true),
 ('aura-abundance-50ml',350,'1 Aura Spray · Abundance · 50ml','气场喷雾 · 丰盛款 · 50ml','[]',298,true);
create table rewards_private.claims (
 id uuid primary key, email_hash text not null check(email_hash ~ '^[a-f0-9]{64}$'), email_hint text not null,
 audio_url text not null, audio_title text not null, submitted_ref text not null,
 state text not null default 'pending' check(state in ('pending','approved','rejected')),
 verified_ref text, actor uuid, actor_label text, reason text not null default '',
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 unique(email_hash,submitted_ref)
);
create unique index rewards_original_once on rewards_private.claims(verified_ref) where state='approved';
create table rewards_private.orders (
 id uuid primary key, email_hash text not null check(email_hash ~ '^[a-f0-9]{64}$'), email_hint text not null,
 reward_id text not null references rewards_private.catalogue(id), variant text not null default '',
 points integer not null check(points>0), name_en text not null, name_zh text not null,
 delivery text not null check(delivery in ('shipping','collection','service')), shipping_myr integer not null,
 state text not null default 'requested' check(state in ('requested','confirmed','fulfilled','cancelled')),
 actor uuid, actor_label text, evidence text not null default '', reason text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table rewards_private.ledger (
 id bigint generated always as identity primary key, email_hash text not null, delta integer not null check(delta<>0),
 kind text not null check(kind in ('award','reserve','refund')), source_id uuid not null,
 actor uuid, actor_label text, created_at timestamptz not null default now(), unique(kind,source_id)
);
create index on rewards_private.claims(email_hash,created_at desc);
create index on rewards_private.orders(email_hash,created_at desc);
create index on rewards_private.ledger(email_hash,created_at desc);
create table rewards_private.actions(request_id uuid primary key,actor uuid not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now());
alter table rewards_private.catalogue enable row level security;
alter table rewards_private.claims enable row level security;
alter table rewards_private.orders enable row level security;
alter table rewards_private.ledger enable row level security;
alter table rewards_private.actions enable row level security;
revoke all on all tables in schema rewards_private from public,anon,authenticated;
revoke all on all sequences in schema rewards_private from public,anon,authenticated;

create function public.fc_rewards_status(p_email_hash text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c jsonb; o jsonb; l jsonb; gifts jsonb; balance bigint; held bigint; active boolean;
begin
 if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request'; end if;
 select coalesce(sum(delta),0) into balance from rewards_private.ledger where email_hash=p_email_hash;
 select coalesce(sum(points),0) into held from rewards_private.orders where email_hash=p_email_hash and state in ('requested','confirmed');
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into c from (select id,audio_url,audio_title,submitted_ref,state,reason,created_at,reviewed_at from rewards_private.claims where email_hash=p_email_hash order by created_at desc limit 100) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into o from (select id,reward_id,variant,points,name_en,name_zh,delivery,shipping_myr,state,reason,created_at,updated_at from rewards_private.orders where email_hash=p_email_hash order by created_at desc limit 100) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into l from (select id,delta,kind,source_id,created_at from rewards_private.ledger where email_hash=p_email_hash order by id desc limit 100) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by points),'[]') into gifts from rewards_private.catalogue x where enabled;
 select (public.fc_chat_paid_membership(p_email_hash)->>'eligible')::boolean into active;
 return jsonb_build_object('balance',balance,'reserved',held,'active',active,'claims',c,'orders',o,'ledger',l,'catalogue',gifts);
end;$$;

create function public.fc_rewards_member(p_email_hash text,p_email_hint text,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare ident uuid:=(p_payload->>'request_id')::uuid; gift rewards_private.catalogue%rowtype; prior rewards_private.orders%rowtype;
 claim rewards_private.claims%rowtype; bal bigint; choice text:=coalesce(p_payload->>'variant',''); delivery text:=p_payload->>'delivery';
begin
 if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' or p_email_hint is null or length(p_email_hint)>254 or ident is null then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fc-rewards:'||p_email_hash,0));
 if p_action='cancel' then
  select * into prior from rewards_private.orders where id=(p_payload->>'order_id')::uuid and email_hash=p_email_hash for update;
  if not found then raise exception 'not_found'; end if;
  if prior.state='cancelled' then return jsonb_build_object('id',prior.id,'replayed',true); end if;
  if prior.state<>'requested' then raise exception 'invalid_transition'; end if;
  update rewards_private.orders set state='cancelled',reason='member_cancelled',updated_at=now() where id=prior.id;
  insert into rewards_private.ledger(email_hash,delta,kind,source_id) values(p_email_hash,prior.points,'refund',prior.id);
  return jsonb_build_object('id',prior.id);
 end if;
 if p_action='claim' then
  select * into claim from rewards_private.claims where id=ident;
  if found then
   if claim.email_hash<>p_email_hash or claim.audio_url<>p_payload->>'audio_url' or claim.submitted_ref<>p_payload->>'comment_ref' then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('id',claim.id,'replayed',true);
  end if;
 elsif p_action='redeem' then
  select * into prior from rewards_private.orders where id=ident;
  if found then
   if prior.email_hash<>p_email_hash or prior.reward_id<>p_payload->>'reward_id' or prior.variant<>choice or prior.delivery<>delivery then raise exception 'idempotency_conflict'; end if;
   return jsonb_build_object('id',prior.id,'replayed',true);
  end if;
 else raise exception 'invalid_request'; end if;
 if not (public.fc_chat_paid_membership(p_email_hash)->>'eligible')::boolean then raise exception 'active_membership_required'; end if;
 if p_action='claim' then
  if length(coalesce(p_payload->>'comment_ref','')) not between 3 and 500 or length(coalesce(p_payload->>'audio_url','')) not between 20 and 500 or length(coalesce(p_payload->>'audio_title','')) not between 1 and 200 then raise exception 'invalid_request'; end if;
  if exists(select 1 from rewards_private.claims where email_hash=p_email_hash and submitted_ref=p_payload->>'comment_ref') then raise exception 'duplicate_claim'; end if;
  insert into rewards_private.claims(id,email_hash,email_hint,audio_url,audio_title,submitted_ref) values(ident,p_email_hash,p_email_hint,p_payload->>'audio_url',p_payload->>'audio_title',p_payload->>'comment_ref');
 else
  select * into gift from rewards_private.catalogue where id=p_payload->>'reward_id' and enabled;
  if not found then raise exception 'reward_unavailable'; end if;
  if (jsonb_array_length(gift.variants)>0 and not gift.variants ? choice) or (jsonb_array_length(gift.variants)=0 and choice<>'') then raise exception 'invalid_variant'; end if;
  if delivery is null or (gift.physical and delivery not in ('shipping','collection')) or (not gift.physical and delivery<>'service') then raise exception 'invalid_delivery'; end if;
  select coalesce(sum(delta),0) into bal from rewards_private.ledger where email_hash=p_email_hash;
  if bal<gift.points then raise exception 'insufficient_points'; end if;
  insert into rewards_private.orders(id,email_hash,email_hint,reward_id,variant,points,name_en,name_zh,delivery,shipping_myr)
  values(ident,p_email_hash,p_email_hint,gift.id,choice,gift.points,gift.name_en,gift.name_zh,delivery,case when delivery='shipping' then 9 else 0 end);
  insert into rewards_private.ledger(email_hash,delta,kind,source_id) values(p_email_hash,-gift.points,'reserve',ident);
 end if;
 return jsonb_build_object('id',ident);
end;$$;

create function public.fc_rewards_staff(p_actor uuid,p_actor_label text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare act text:=p_payload->>'action'; ident uuid:=(p_payload->>'request_id')::uuid; target uuid:=(p_payload->>'id')::uuid;
 claim rewards_private.claims%rowtype; ord rewards_private.orders%rowtype; member text; result jsonb; prior rewards_private.actions%rowtype;
 ref text:=p_payload->>'verified_ref'; v_reason text:=coalesce(p_payload->>'reason',''); v_evidence text:=coalesce(p_payload->>'evidence','');
begin
 if p_actor is null or length(coalesce(p_actor_label,'')) not between 1 and 60 or ident is null or target is null or act is null or act not in ('approve','reject','confirm','fulfil','cancel') then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fc-rewards-action:'||ident::text,0));
 select * into prior from rewards_private.actions where request_id=ident;
 if found then
  if prior.actor<>p_actor or prior.payload<>p_payload then raise exception 'idempotency_conflict'; end if;
  return prior.result||jsonb_build_object('replayed',true);
 end if;
 if act in ('approve','reject') then select email_hash into member from rewards_private.claims where id=target;
 else select email_hash into member from rewards_private.orders where id=target; end if;
 if member is null then raise exception 'not_found'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fc-rewards:'||member,0));
 if act in ('approve','reject') then
  select * into claim from rewards_private.claims where id=target for update;
  if claim.state<>'pending' then raise exception 'invalid_transition'; end if;
  if act='approve' then
   if not (public.fc_chat_paid_membership(member)->>'eligible')::boolean then raise exception 'active_membership_required'; end if;
   if p_payload->>'original_verified' is distinct from 'true' or p_payload->>'legacy_checked' is distinct from 'true' or length(coalesce(ref,'')) not between 3 and 500 then raise exception 'verification_required'; end if;
   if exists(select 1 from rewards_private.claims where verified_ref=ref and state='approved') then raise exception 'duplicate_original'; end if;
   update rewards_private.claims set state='approved',verified_ref=ref,actor=p_actor,actor_label=p_actor_label,reviewed_at=now() where id=target;
   insert into rewards_private.ledger(email_hash,delta,kind,source_id,actor,actor_label) values(member,10,'award',target,p_actor,p_actor_label);
  else
   if length(v_reason) not between 3 and 300 then raise exception 'reason_required'; end if;
   update rewards_private.claims set state='rejected',reason=v_reason,actor=p_actor,actor_label=p_actor_label,reviewed_at=now() where id=target;
  end if;
 else
  select * into ord from rewards_private.orders where id=target for update;
  if act='cancel' then
   if ord.state not in ('requested','confirmed') then raise exception 'invalid_transition'; end if;
   if length(v_reason) not between 3 and 300 then raise exception 'reason_required'; end if;
   update rewards_private.orders set state='cancelled',reason=v_reason,actor=p_actor,actor_label=p_actor_label,updated_at=now() where id=target;
   insert into rewards_private.ledger(email_hash,delta,kind,source_id,actor,actor_label) values(member,ord.points,'refund',target,p_actor,p_actor_label);
  else
   if not (public.fc_chat_paid_membership(member)->>'eligible')::boolean then raise exception 'active_membership_required'; end if;
   if act='confirm' then
    if ord.state<>'requested' then raise exception 'invalid_transition'; end if;
    if p_payload->>'stock_confirmed' is distinct from 'true' then raise exception 'stock_confirmation_required'; end if;
    update rewards_private.orders set state='confirmed',actor=p_actor,actor_label=p_actor_label,updated_at=now() where id=target;
   else
    if ord.state<>'confirmed' then raise exception 'invalid_transition'; end if;
    if length(v_evidence) not between 3 and 300 then raise exception 'evidence_required'; end if;
    if ord.shipping_myr>0 and p_payload->>'shipping_paid' is distinct from 'true' then raise exception 'shipping_payment_required'; end if;
    if ord.reward_id='membership-day' then
     if p_payload->>'access_updated' is distinct from 'true' or (p_payload->>'after_day')::date<>(p_payload->>'before_day')::date+1 or p_payload->>'before_day' is null or p_payload->>'after_day' is null then raise exception 'access_evidence_required'; end if;
     v_evidence:=v_evidence||' ['||(p_payload->>'before_day')||' -> '||(p_payload->>'after_day')||']';
    end if;
    update rewards_private.orders set state='fulfilled',evidence=v_evidence,actor=p_actor,actor_label=p_actor_label,updated_at=now() where id=target;
   end if;
  end if;
 end if;
 result:=jsonb_build_object('id',target,'action',act);
 insert into rewards_private.actions(request_id,actor,payload,result) values(ident,p_actor,p_payload,result);
 return result;
end;$$;

create function public.fc_rewards_queue(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c jsonb;o jsonb;total bigint;
begin
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'invalid_request'; end if;
 select count(*) into total from rewards_private.claims where state='pending';
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into c from (select * from rewards_private.claims where state='pending' order by created_at limit 50 offset p_offset) x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into o from (select * from rewards_private.orders where state in ('requested','confirmed') order by created_at limit 50 offset p_offset) x;
 return jsonb_build_object('claims',c,'orders',o,'offset',p_offset,'hasMore',jsonb_array_length(c)=50 or jsonb_array_length(o)=50);
end;$$;
revoke all on function public.fc_rewards_status(text),public.fc_rewards_member(text,text,text,jsonb),public.fc_rewards_staff(uuid,text,jsonb),public.fc_rewards_queue(integer) from public,anon,authenticated;
grant execute on function public.fc_rewards_status(text),public.fc_rewards_member(text,text,text,jsonb),public.fc_rewards_staff(uuid,text,jsonb),public.fc_rewards_queue(integer) to service_role;
commit;
