const express=require('express');
const {configuredCareAdmin,prepareChange,emailIdentity}=require('../services/care-admin');
const {createEmailAuth}=require('../services/care-chat-email-auth');
const {createEmailResendGuard}=require('../services/care-chat-email-guard');
function createCareAdminRouter({store=configuredCareAdmin(),emailAuth=createEmailAuth({url:process.env.FC_SUPABASE_URL,publicKey:process.env.FC_SUPABASE_PUBLISHABLE_KEY,enabled:process.env.FC_CARE_ADMIN_ENABLED==='true'}),now=Date.now}={}){
 const router=express.Router(),resends=createEmailResendGuard({now});let count=0,until=0,active=0;
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  const self=process.env.RENDER_EXTERNAL_URL||'http://'+req.headers.host;
  if(!(req.method==='GET'&&req.path==='/features')&&req.headers.origin!==self)return res.status(403).json({error:'origin_not_allowed'});
  if(now()>=until){count=0;until=now()+600000;}
  if(++count>100)return res.status(429).json({error:'please_wait'});
  next();
 });
 router.get('/features',(req,res)=>res.json({available:store.ready===true&&emailAuth.ready===true}));
 const action=fn=>async(req,res)=>{
  if(!store.ready||!emailAuth.ready)return res.status(503).json({error:'admin_not_ready'});
  if(active>=2)return res.status(429).json({error:'please_wait'});active++;
  try{await fn(req,res);}catch(error){
   const code=String(error.message),known=['staff_login_required','staff_access_denied','staff_reauthentication_required','revision_conflict','duplicate_payment_reference','invalid_membership_transition','idempotency_conflict','auth_please_wait','invalid_or_expired_code','invalid_email','invalid_dates','invalid_action','invalid_revision','invalid_request','payment_confirmation_required','payment_reference_required','audio_confirmation_required','manager_approval_required'];
   const safe=known.includes(code)?code:'admin_store_unavailable';
   res.status(safe==='staff_login_required'||safe==='staff_reauthentication_required'?401:safe==='staff_access_denied'?403:safe==='auth_please_wait'?429:['revision_conflict','duplicate_payment_reference','idempotency_conflict'].includes(safe)?409:safe==='admin_store_unavailable'?503:422).json({error:safe});
  }finally{active--;}
 };
 router.post('/auth/request-code',action(async(req,res)=>{
  const email=emailIdentity(req.body?.email).email,attempt=resends.reserve(email);
  if(!attempt.allowed){res.set('Retry-After',String(attempt.retryAfter));return res.status(429).json({error:'auth_please_wait'});}
  if(store.canRequestCode(email))await emailAuth.requestCode(email);
  res.json({sent:true});
 }));
 router.post('/auth/verify-code',action(async(req,res)=>{
  const email=emailIdentity(req.body?.email).email,code=req.body?.code;
  if(!store.canRequestCode(email))throw Error('staff_access_denied');
  if(typeof code!=='string'||!/^\d{6,10}$/.test(code))throw Error('invalid_request');
  const session=await emailAuth.verifyCode(email,code);
  try{await store.verifyStaff({headers:{authorization:'Bearer '+session.accessToken}});}catch(error){try{await emailAuth.signOut(session.accessToken);}catch{}throw error;}
  // Staff sessions stay in tab memory; no refresh token is exposed or remembered.
  res.json({accessToken:session.accessToken});
 }));
 router.post('/auth/logout',action(async(req,res)=>{
  if(!/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(req.headers.authorization||''))throw Error('staff_login_required');
  await emailAuth.signOut(req.headers.authorization.slice(7));res.json({signedOut:true});
 }));
 router.post('/query',action(async(req,res)=>{await store.verifyStaff(req);res.json(await store.query(req.body?.email));}));
 router.post('/tasks',action(async(req,res)=>{await store.verifyStaff(req);res.json(await store.tasks(req.body?.offset??0));}));
 router.post('/save',action(async(req,res)=>{
  const actor=await store.verifyStaff(req),payload=prepareChange(req.body);
  res.json(await store.save(actor,payload));
 }));
 return router;
}
module.exports={createCareAdminRouter};
