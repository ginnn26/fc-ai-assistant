const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {prepareChange,emailIdentity}=require('../services/care-admin');
test('operator membership SQL: lifecycle, permissions, audit, idempotency and duplicate payment guards',{skip:!process.env.FC_ADMIN_PGLITE_MODULE},async t=>{
 const {PGlite}=require(process.env.FC_ADMIN_PGLITE_MODULE),db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role;');
  for(const name of ['20261025_care_chat_ledger.sql','20261026_care_chat_allowance_status.sql','20261026_care_chat_rm7_ceiling.sql','20261026_care_chat_pack_rm15.sql','20261026_care_chat_paid_membership.sql','20261026_care_chat_operator_admin.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
  const actor='12345678-1234-4123-8123-123456789012',email='fictional@example.com',hash=emailIdentity(email).emailHash;
  const day=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
  const form=(action,version,extra={})=>prepareChange({email,action,expectedVersion:version,requestId:crypto.randomUUID(),plan:'annual',startDay:day(-1),lastDay:day(35),paymentReference:'fictional-receipt-1',paymentConfirmed:true,...extra});
  const save=async(payload,who=actor)=>(await db.query('select public.fc_admin_membership_save($1,$2,$3) as result',[who,'Fictional Staff',payload])).rows[0].result;
  const eligible=async()=>(await db.query('select public.fc_chat_paid_membership($1) as result',[hash])).rows[0].result.eligible;
  const tasks=async(offset=0)=>(await db.query('select public.fc_admin_membership_tasks($1) as result',[offset])).rows[0].result;
  await db.query('insert into care_private.monthly_usage(member,month,used_sen) values($1,$2,65)',['a'.repeat(64),'2026-10']);
  await t.test('activation grants only confirmed coverage and flags missing FC audio confirmation',async()=>{
   const result=await save(form('activate',0));assert.equal(result.member.chat_active,true);assert.equal(result.member.version,1);assert.equal(await eligible(),true);
   assert.equal((await tasks()).items[0].audio_pending,true);
  });
  await t.test('audio confirmation clears pending work; cancellation preserves paid-through access',async()=>{
   await save(form('confirm_audio',1,{audioActive:true}));assert.equal((await tasks()).total,0);
   const result=await save(form('cancel_at_end',2));assert.equal(result.member.state,'nonrenewing');assert.equal(await eligible(),true);
  });
  let renewal;
  await t.test('renewal retains consumed allowance and repeated requests cannot duplicate it',async()=>{
   renewal=form('renew',3,{paymentReference:'fictional-receipt-2',lastDay:day(80)});
   assert.equal((await save(renewal)).member.version,4);assert.equal((await save(renewal)).replayed,true);
   assert.equal((await db.query('select used_sen from care_private.monthly_usage')).rows[0].used_sen,65);
   await assert.rejects(save({...renewal,paid_until:new Date(Date.now()+99*86400000).toISOString()}),/idempotency_conflict/);
  });
  await t.test('stale versions and duplicate receipts fail atomically without a new grant',async()=>{
   await assert.rejects(save(form('renew',3,{paymentReference:'fictional-receipt-3'})),/revision_conflict/);
   await assert.rejects(save(form('activate',0,{email:'other@example.com',paymentReference:'fictional-receipt-1'})),/duplicate_payment_reference/);
   assert.equal((await db.query('select count(*)::int n from care_private.operator_memberships')).rows[0].n,1);
   await assert.rejects(save(form('renew',4,{paymentReference:'fictional-receipt-4',lastDay:day(40)})),/invalid_membership_transition/);
  });
  await t.test('early revoke requires approval, stops eligibility, and records outstanding audio work',async()=>{
   const result=await save(form('revoke',4,{managerApproved:true,approvalReference:'fictional-approval-1'}));assert.equal(result.member.chat_active,false);assert.equal(await eligible(),false);assert.equal((await tasks()).items[0].audio_pending,true);
   await save(form('confirm_audio',5,{audioActive:false}));assert.equal((await tasks()).total,0);
   const record=(await db.query('select public.fc_admin_membership_query($1) as result',[hash])).rows[0].result;
   assert.equal(record.events.length,6);assert.ok(record.events.every(e=>e.actor_label==='Fictional Staff'));assert.equal(record.events[0].action,'confirm_audio');
  });
  await t.test('a mistaken revoke can be restored with approval without extending coverage or resetting usage',async()=>{
   const result=await save(form('restore',6,{managerApproved:true,approvalReference:'fictional-restore-1'}));
   assert.equal(result.member.version,7);assert.equal(await eligible(),true);
   assert.equal((await db.query('select used_sen from care_private.monthly_usage')).rows[0].used_sen,65);
   await save(form('revoke',7,{managerApproved:true,approvalReference:'fictional-revoke-2'}));
  });
  await t.test('end-of-term eligibility expires without an automated job',async()=>{
   await db.query("update care_private.paid_memberships set revoked=false,paid_until=now()-interval '1 second' where email_hash=$1",[hash]);assert.equal(await eligible(),false);
  });
  await t.test('anonymous and ordinary authenticated clients cannot read or operate admin tables/RPCs',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec('set role '+role);
    try{await assert.rejects(db.query('select public.fc_admin_membership_query($1)',[hash]),/permission denied/);await assert.rejects(db.query('select * from care_private.operator_memberships'),/permission denied/);}
    finally{await db.exec('reset role');}
   }
  });
 }finally{await db.close();}
});
