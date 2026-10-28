const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),crypto=require('crypto');
const {createPointsRouter}=require('../routes/testimonial-points');
test('reward HTTP routes enforce origin, verified identity, staff roles and safe errors before any write',async()=>{
 const calls=[],store={ready:true,health:async()=>true,verifyMember:async req=>{if(req.headers.authorization!=='Bearer valid-member')throw Error('member_login_required');return{emailHash:'a'.repeat(64),emailHint:'m***@example.com'};},verifyStaff:async req=>{if(req.headers.authorization!=='Bearer valid-staff')throw Error('staff_access_denied');return{id:'12345678-1234-4123-8123-123456789012',label:'QA'};},status:async m=>{calls.push(['status',m]);return{balance:10};},member:async(m,a,p)=>{calls.push([a,m,p]);return{id:p.request_id};},query:async email=>({email}),queue:async()=>({claims:[],orders:[]}),staff:async(a,p)=>{calls.push(['staff',a,p]);return{saved:true};}};
 const app=express();app.use(express.json());app.use('/rewards-api',createPointsRouter({store}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const origin='http://127.0.0.1:'+server.address().port;
 const req=async(path,body={},token='',from=origin)=>{const r=await fetch(origin+'/rewards-api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:from,Authorization:token},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};};
 try{
  assert.equal((await req('status')).status,401);assert.equal((await req('staff/queue',{},'Bearer valid-member')).status,403);assert.equal((await req('status',{},'Bearer valid-member','https://evil.example')).status,403);assert.equal(calls.length,0);
  assert.equal((await req('status',{email:'victim@example.com'},'Bearer valid-member')).body.balance,10);assert.equal(calls[0][1].emailHash,'a'.repeat(64));
  const id=crypto.randomUUID();assert.equal((await req('redeem',{requestId:id,rewardId:'membership-day',delivery:'service',agreed:true,points:0,email:'victim@example.com'},'Bearer valid-member')).status,200);assert.equal(calls[1][2].points,undefined);assert.equal(calls[1][1].emailHash,'a'.repeat(64));
  assert.equal((await req('staff/action',{requestId:crypto.randomUUID(),id,action:'approve',verifiedRef:'test-original',originalVerified:true,legacyChecked:true},'Bearer valid-member')).status,403);
  assert.equal((await req('staff/action',{requestId:crypto.randomUUID(),id,action:'approve',verifiedRef:'test-original',originalVerified:true,legacyChecked:true},'Bearer valid-staff')).status,200);
  const r=await fetch(origin+'/rewards-api/features');assert.deepEqual(await r.json(),{available:true,version:'2026-10-28-points-v1',pointsPerVerifiedTestimonial:10});
 }finally{await new Promise(r=>server.close(r));}
});
