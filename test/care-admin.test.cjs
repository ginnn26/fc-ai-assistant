const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),express=require('express');
const {prepareChange,emailIdentity,localDay,createCareAdminStore}=require('../services/care-admin');
const {createCareAdminRouter}=require('../routes/care-admin');
const base=()=>({email:' Fictional@Example.com ',action:'activate',expectedVersion:0,requestId:crypto.randomUUID(),plan:'annual',startDay:'2026-10-26',lastDay:'2027-10-25',paymentReference:'RECEIPT-1',paymentConfirmed:true});
test('manual membership dates use an inclusive last day in Malaysia and reject impossible dates',()=>{
 assert.equal(localDay('2026-10-26'),'2026-10-25T16:00:00.000Z');
 assert.equal(localDay('2027-10-25',true),'2027-10-25T16:00:00.000Z');
 assert.throws(()=>localDay('2026-02-29'),/invalid_dates/);
 assert.equal(localDay('2028-02-29',true),'2028-02-29T16:00:00.000Z');
 assert.throws(()=>prepareChange({...base(),lastDay:'2026-10-20'}),/invalid_dates/);
 const payload=prepareChange(base());assert.match(payload.email_hash,/^[a-f0-9]{64}$/);
 assert.equal(payload.email_hint,'f***@example.com');assert.equal('email' in payload,false);
 assert.notEqual(payload.reference_hash,emailIdentity('fictional@example.com').emailHash);
});
test('payments and early termination require explicit checks, while cancellation keeps existing paid dates',()=>{
 assert.throws(()=>prepareChange({...base(),paymentConfirmed:false}),/payment_confirmation_required/);
 assert.throws(()=>prepareChange({...base(),paymentReference:''}),/payment_reference_required/);
 const cancel=prepareChange({...base(),action:'cancel_at_end',expectedVersion:2});assert.equal('paid_until' in cancel,false);
 assert.throws(()=>prepareChange({...base(),action:'revoke'}),/manager_approval_required/);
 const revoke=prepareChange({...base(),action:'revoke',managerApproved:true,approvalReference:'approval-42'});assert.match(revoke.approval_hash,/^[a-f0-9]{64}$/);
 assert.throws(()=>prepareChange({...base(),action:'confirm_audio',audioActive:'true'}),/audio_confirmation_required/);
});
test('staff identity is verified server-side and email ownership never makes a normal customer an admin',async()=>{
 const now=Date.parse('2026-10-26T05:00:00Z'),email='staff@example.com',staffHash=emailIdentity(email).emailHash;
 let user={id:'12345678-1234-4123-8123-123456789012',email,email_confirmed_at:'2026-10-25',last_sign_in_at:new Date(now).toISOString(),is_anonymous:false};
 const store=createCareAdminStore({enabled:true,url:'https://fictional.supabase.co',publicKey:'public-fixture',serverKey:'sb_secret_fixture',staffHashes:[staffHash],staffLabels:{[staffHash]:'Fictional Staff'},now:()=>now,fetcher:async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer '+'x'.repeat(40));return Response.json(user);}});
 assert.equal(store.ready,true);
 assert.equal(store.canRequestCode('customer@example.com'),false);
 const req={headers:{authorization:'Bearer '+'x'.repeat(40)},body:{role:'admin',email:'forged@example.com'}};
 assert.equal((await store.verifyStaff(req)).label,'Fictional Staff');
 user={...user,email:'customer@example.com'};await assert.rejects(store.verifyStaff(req),/staff_access_denied/);
 user={...user,email,last_sign_in_at:'2026-01-01'};await assert.rejects(store.verifyStaff(req),/staff_reauthentication_required/);
 await assert.rejects(store.verifyStaff({headers:{}}),/staff_login_required/);
 assert.equal(createCareAdminStore({enabled:true,url:'https://fictional.supabase.co',publicKey:'x',serverKey:'y',staffHashes:[]}).ready,false);
});
test('admin routes deny non-staff and cross-origin writes without a storage operation',async()=>{
 let writes=0,actor;
 const app=express();app.use(express.json());app.use('/care-admin',createCareAdminRouter({
  store:{ready:true,verifyStaff:async req=>{if(req.headers.authorization!=='Bearer fixture')throw Error('staff_access_denied');return{id:'trusted-actor',label:'Agnes fixture'};},save:async(who,payload)=>{writes++;actor=who;return{member:{version:1},request:payload.request_id};}},emailAuth:{ready:true}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const post=(extra={},from=origin)=>fetch(origin+'/care-admin/save',{method:'POST',headers:{Origin:from,'Content-Type':'application/json',...extra},body:JSON.stringify({...base(),actor:'forged-actor'})});
 try{
  assert.equal((await post()).status,403);assert.equal(writes,0);
  assert.equal((await post({Authorization:'Bearer fixture'},'https://attacker.example')).status,403);assert.equal(writes,0);
  assert.equal((await post({Authorization:'Bearer fixture'})).status,200);assert.equal(writes,1);assert.equal(actor.id,'trusted-actor');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
