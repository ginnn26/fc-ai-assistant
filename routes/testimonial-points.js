'use strict';
const express=require('express');
const {configuredPoints,memberPayload,staffPayload}=require('../services/testimonial-points');
function createPointsRouter({store=configuredPoints(),now=Date.now}={}){
 const router=express.Router();let count=0,until=0,active=0;
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  const self=process.env.RENDER_EXTERNAL_URL||'http://'+req.headers.host;
  if(!(req.method==='GET'&&req.path==='/features')&&req.headers.origin!==self)return res.status(403).json({error:'origin_not_allowed'});
  if(now()>=until){count=0;until=now()+60000;}if(++count>240)return res.status(429).json({error:'please_wait'});next();
 });
 const act=fn=>async(req,res)=>{
  if(!store.ready)return res.status(503).json({error:'points_unavailable'});
  if(active>=8)return res.status(429).json({error:'please_wait'});active++;
  try{await fn(req,res);}catch(e){
   const safe=['member_login_required','staff_login_required','staff_access_denied','staff_reauthentication_required','invalid_email','invalid_dates','invalid_request','invalid_audio','invalid_variant','invalid_delivery','active_membership_required','insufficient_points','duplicate_claim','duplicate_original','idempotency_conflict','invalid_transition','not_found','verification_required','stock_confirmation_required','evidence_required','shipping_payment_required','access_evidence_required','reason_required','terms_required'];
   const code=safe.includes(e.message)?e.message:'points_unavailable';res.status(code.includes('login_required')||code==='staff_reauthentication_required'?401:code==='staff_access_denied'||code==='active_membership_required'?403:code==='points_unavailable'?503:code==='not_found'?404:['duplicate_claim','duplicate_original','idempotency_conflict','invalid_transition'].includes(code)?409:422).json({error:code});
  }finally{active--;}
 };
 router.get('/features',async(req,res)=>{let available=false;try{if(store.ready)available=await store.health();}catch{}res.json({available,version:'2026-10-28-points-v1',pointsPerVerifiedTestimonial:10});});
 router.post('/status',act(async(req,res)=>res.json(await store.status(await store.verifyMember(req)))));
 for(const action of ['claim','redeem','cancel'])router.post('/'+action,act(async(req,res)=>{const member=await store.verifyMember(req),payload=memberPayload(action,req.body);res.json(await store.member(member,action,payload));}));
 router.post('/staff/queue',act(async(req,res)=>{await store.verifyStaff(req);const n=req.body?.offset??0;if(!Number.isSafeInteger(n)||n<0||n>100000)throw Error('invalid_request');res.json(await store.queue(n));}));
 router.post('/staff/query',act(async(req,res)=>{await store.verifyStaff(req);res.json(await store.query(req.body?.email));}));
 router.post('/staff/action',act(async(req,res)=>{const actor=await store.verifyStaff(req);res.json(await store.staff(actor,staffPayload(req.body)));}));
 return router;
}
module.exports={createPointsRouter};
