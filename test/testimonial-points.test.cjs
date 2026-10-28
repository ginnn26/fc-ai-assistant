const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {memberPayload,staffPayload,createPointsStore}=require('../services/testimonial-points');
const {emailIdentity}=require('../services/care-admin');
const uuid=()=>crypto.randomUUID(),actor=uuid();
test('points request validation trusts only catalogue audio and rejects invented terms/identity',()=>{
 const r=require('../public/daily-guide/catalog.json')[0];
 const p=memberPayload('claim',{requestId:uuid(),audioUrl:r.url,commentRef:'COMMENT-123',email:'other@example.com',points:999});
 assert.equal(p.comment_ref,'comment-123');assert.equal(p.audio_title,r.title+' · '+r.version);assert.equal(p.email,undefined);assert.equal(p.points,undefined);
 assert.throws(()=>memberPayload('claim',{requestId:uuid(),audioUrl:'https://evil.example/path-player',commentRef:'abc'}),/invalid_audio/);
 assert.throws(()=>memberPayload('redeem',{requestId:uuid(),rewardId:'x',agreed:false,delivery:'shipping'}),/terms_required/);
 assert.throws(()=>staffPayload({requestId:uuid(),id:uuid(),action:'approve',verifiedRef:'comment123',originalVerified:true}),/verification_required/);
 assert.throws(()=>staffPayload({requestId:uuid(),id:uuid(),action:'fulfil',evidence:'proof',accessUpdated:true,beforeDay:'2026-10-28',afterDay:'2026-10-30'}),/access_evidence_required/);
});
test('points identity is derived from confirmed server Auth, not request email',async()=>{
 const calls=[];const store=createPointsStore({url:'https://example.supabase.co',publicKey:'public',serverKey:'secret',staff:{ready:true},fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:actor,email:'actual@example.com',email_confirmed_at:'today'})};}});
 const member=await store.verifyMember({headers:{authorization:'Bearer '+'x'.repeat(50)},body:{email:'victim@example.com'}});
 assert.equal(member.emailHash,emailIdentity('actual@example.com').emailHash);assert.equal(calls.length,1);
 await assert.rejects(store.verifyMember({headers:{}}),/member_login_required/);
});
test('transactional points ledger: verification, duplicates, reservation, fulfilment, refunds, eligibility and permissions',async t=>{
 const {PGlite}=require('C:/Users/HP/outputs/fc-language-tools/node_modules/@electric-sql/pglite');const db=new PGlite();
 const member=emailIdentity('fictional@example.com').emailHash,other=emailIdentity('other@example.com').emailHash;
 const memberCall=async(action,payload,m=member)=>(await db.query('select public.fc_rewards_member($1,$2,$3,$4) r',[m,'f***@example.com',action,payload])).rows[0].r;
 const staff=async(payload,who=actor)=>(await db.query('select public.fc_rewards_staff($1,$2,$3) r',[who,'QA Staff',payload])).rows[0].r;
 const status=async(m=member)=>(await db.query('select public.fc_rewards_status($1) r',[m])).rows[0].r;
 const active=async(m=member)=>db.query("insert into care_private.paid_memberships(source,source_record,email_hash,paid_from,paid_until,verified_until) values('operator_verified',$1,$1,now()-interval '1 day',now()+interval '30 days',now()+interval '30 days')",[m]);
 const claimForm=()=>({request_id:uuid(),audio_url:'https://frequencies-clinic.learnworlds.com/path-player?courseid=sound-healing&unit=qaUnit',audio_title:'QA audio',comment_ref:uuid()});
 const approve=(id,ref=uuid())=>({request_id:uuid(),id,action:'approve',verified_ref:ref,original_verified:true,legacy_checked:true});
 const redeem=(reward='membership-day',extra={})=>({request_id:uuid(),reward_id:reward,variant:'',delivery:'service',...extra});
 try{
  await db.exec('create role anon; create role authenticated; create role service_role; create schema care_private;');
  for(const name of ['20261026_care_chat_paid_membership.sql','20261028_testimonial_points.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
  await active();await active(other);
  await t.test('pending earns nothing; approval is exactly 10 and idempotent',async()=>{
   const c=claimForm();await memberCall('claim',c);assert.equal((await status()).balance,0);const a=approve(c.request_id);await staff(a);assert.equal((await status()).balance,10);assert.equal((await staff(a)).replayed,true);assert.equal((await status()).balance,10);await assert.rejects(staff({...a,request_id:uuid()}),/invalid_transition/);
   await assert.rejects(staff({...a,verified_ref:'different'}),/idempotency_conflict/);
  });
  await t.test('duplicate original across accounts cannot earn twice; missing verification cannot award',async()=>{
   const a=claimForm(),b=claimForm();await memberCall('claim',a);await memberCall('claim',b,other);const ref=uuid();await staff(approve(a.request_id,ref));await assert.rejects(staff(approve(b.request_id,ref)),/duplicate_original/);assert.equal((await status(other)).balance,0);
   await assert.rejects(staff({...approve(b.request_id),legacy_checked:false}),/verification_required/);
   await assert.rejects(memberCall('claim',{...a,request_id:uuid()}),/duplicate_claim/);
  });
  await t.test('rejection requires a reason and never adds points',async()=>{
   const c=claimForm();await memberCall('claim',c);const before=(await status()).balance;await assert.rejects(staff({request_id:uuid(),id:c.request_id,action:'reject'}),/reason_required/);await staff({request_id:uuid(),id:c.request_id,action:'reject',reason:'Could not verify original'});assert.equal((await status()).balance,before);
  });
  await t.test('insufficient funds and fake prices cannot create a redemption',async()=>{
   await assert.rejects(memberCall('redeem',redeem('aura-abundance-50ml',{points:1,delivery:'shipping'})),/insufficient_points/);assert.equal((await status()).orders.length,0);
  });
  for(let n=0;n<3;n++){const c=claimForm();await memberCall('claim',c);await staff(approve(c.request_id));}
  let order;
  await t.test('concurrent requests cannot overdraw; repeated request reserves only once',async()=>{
   order=redeem();const second=redeem();const result=await Promise.allSettled([memberCall('redeem',order),memberCall('redeem',second)]);assert.equal(result.filter(x=>x.status==='fulfilled').length,1);assert.equal((await status()).balance,0);assert.equal((await status()).reserved,50);assert.equal((await memberCall('redeem',order)).replayed,true);assert.equal((await status()).balance,0);
  });
  await t.test('member cancellation refunds once and can run when account expired',async()=>{
   await db.query("update care_private.paid_memberships set revoked=true where email_hash=$1",[member]);await memberCall('cancel',{request_id:uuid(),order_id:order.request_id});await memberCall('cancel',{request_id:uuid(),order_id:order.request_id});assert.equal((await status()).balance,50);assert.equal((await status()).reserved,0);assert.equal((await status()).active,false);
   await assert.rejects(memberCall('redeem',redeem()),/active_membership_required/);await assert.rejects(memberCall('claim',claimForm()),/active_membership_required/);await db.query('update care_private.paid_memberships set revoked=false where email_hash=$1',[member]);
  });
  await t.test('days require no renewal but need actual access-extension evidence; cannot fulfil twice',async()=>{
   const o=redeem();await memberCall('redeem',o);await assert.rejects(staff({request_id:uuid(),id:o.request_id,action:'confirm'}),/stock_confirmation_required/);await staff({request_id:uuid(),id:o.request_id,action:'confirm',stock_confirmed:true});
   await assert.rejects(memberCall('cancel',{request_id:uuid(),order_id:o.request_id}),/invalid_transition/);await assert.rejects(staff({request_id:uuid(),id:o.request_id,action:'fulfil',evidence:'FC extension confirmed'}),/access_evidence_required/);
   await staff({request_id:uuid(),id:o.request_id,action:'fulfil',evidence:'FC extension QA reference',access_updated:true,before_day:'2026-10-28',after_day:'2026-10-29'});assert.equal((await status()).reserved,0);assert.equal((await status()).balance,0);
   await assert.rejects(staff({request_id:uuid(),id:o.request_id,action:'cancel',reason:'again'}),/invalid_transition/);
  });
  for(let n=0;n<20;n++){const c=claimForm();await memberCall('claim',c);await staff(approve(c.request_id));}
  await t.test('variants validated, shipping fixed RM9, stock confirmation and shipping evidence enforced',async()=>{
   await assert.rejects(memberCall('redeem',redeem('essential-oil-10ml',{variant:'invented',delivery:'shipping'})),/invalid_variant/);
   await assert.rejects(memberCall('redeem',redeem('essential-oil-10ml',{variant:'Good Night'})),/invalid_delivery/);
   const o=redeem('essential-oil-10ml',{variant:'Good Night',delivery:'shipping',points:1,shipping_myr:0});await memberCall('redeem',o);const rec=(await status()).orders.find(x=>x.id===o.request_id);assert.equal(rec.points,150);assert.equal(rec.shipping_myr,9);await staff({request_id:uuid(),id:o.request_id,action:'confirm',stock_confirmed:true});await assert.rejects(staff({request_id:uuid(),id:o.request_id,action:'fulfil',evidence:'tracking QA'}),/shipping_payment_required/);
   await staff({request_id:uuid(),id:o.request_id,action:'cancel',reason:'Out of stock; member may choose another'});assert.equal((await status()).balance,200);
  });
  await t.test('one account cannot cancel or read another account through spoofed request fields',async()=>{
   const o=redeem();await memberCall('redeem',o);await assert.rejects(memberCall('cancel',{request_id:uuid(),order_id:o.request_id},other),/not_found/);assert.equal((await status(other)).orders.length,0);await memberCall('cancel',{request_id:uuid(),order_id:o.request_id});
  });
  await t.test('catalogue values and all seven thresholds match confirmed owner policy',async()=>{
   const c=(await status()).catalogue;assert.deepEqual(c.map(x=>x.points),[50,100,150,180,200,300,350]);assert.deepEqual(c.map(x=>x.value_myr),[null,99,198,190,190,298,298]);assert.equal(c[3].variants.length,3);
  });
  await t.test('anonymous and ordinary authenticated cannot read tables or call privileged reward functions',async()=>{
   for(const role of ['anon','authenticated']){await db.exec('set role '+role);try{await assert.rejects(db.query('select * from rewards_private.ledger'),/permission denied/);await assert.rejects(db.query('select public.fc_rewards_status($1)',[member]),/permission denied/);await assert.rejects(db.query('select public.fc_rewards_queue(0)'),/permission denied/);}finally{await db.exec('reset role');}}
  });
 }finally{await db.close();}
});
