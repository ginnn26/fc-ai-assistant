'use strict';
const {emailIdentity,localDay,configuredCareAdmin}=require('./care-admin');
const recordings=require('../public/daily-guide/catalog.json');
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const text=(v,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max||/[\x00-\x1f]/.test(v))throw Error('invalid_request');return v.trim();};
const reference=v=>text(v,3,500).toLowerCase();
function audio(value){
 let u;try{u=new URL(value);}catch{throw Error('invalid_audio');}
 if(u.origin!=='https://frequencies-clinic.learnworlds.com'||u.pathname!=='/path-player'||u.username||u.password)throw Error('invalid_audio');
 const record=recordings.find(r=>r.course===u.searchParams.get('courseid')&&r.unit===(u.searchParams.get('unit')||'').replace(/Unit$/,''));
 if(!record)throw Error('invalid_audio');
 return {audio_url:'https://frequencies-clinic.learnworlds.com/path-player?courseid='+record.course+'&unit='+record.unit+'Unit',audio_title:record.title+' · '+record.version};
}
function memberPayload(action,body){
 if(!uuid(body?.requestId))throw Error('invalid_request');
 const p={request_id:body.requestId};
 if(action==='claim')Object.assign(p,audio(body.audioUrl),{comment_ref:reference(body.commentRef)});
 else if(action==='redeem'){
  if(body.agreed!==true)throw Error('terms_required');
  p.reward_id=text(body.rewardId,3,80);p.variant=body.variant===undefined?'':text(body.variant,0,40);
  if(!['shipping','collection','service'].includes(body.delivery))throw Error('invalid_delivery');p.delivery=body.delivery;
 }else if(action==='cancel'){if(!uuid(body.orderId))throw Error('invalid_request');p.order_id=body.orderId;}
 else throw Error('invalid_request');
 return p;
}
function staffPayload(body){
 if(!uuid(body?.requestId)||!uuid(body.id)||!['approve','reject','confirm','fulfil','cancel'].includes(body.action))throw Error('invalid_request');
 const p={request_id:body.requestId,id:body.id,action:body.action};
 if(body.action==='approve'){
  if(body.originalVerified!==true||body.legacyChecked!==true)throw Error('verification_required');
  Object.assign(p,{verified_ref:reference(body.verifiedRef),original_verified:true,legacy_checked:true});
 }
 if(['reject','cancel'].includes(body.action))p.reason=text(body.reason,3,300);
 if(body.action==='confirm') {if(body.stockConfirmed!==true)throw Error('stock_confirmation_required');p.stock_confirmed=true;}
 if(body.action==='fulfil'){
  p.evidence=text(body.evidence,3,300);p.shipping_paid=body.shippingPaid===true;
  if(body.accessUpdated===true){localDay(body.beforeDay);localDay(body.afterDay);if(Date.parse(body.afterDay)-Date.parse(body.beforeDay)!==86400000)throw Error('access_evidence_required');Object.assign(p,{access_updated:true,before_day:body.beforeDay,after_day:body.afterDay});}
 }
 return p;
}
const errors=new Set(['invalid_request','invalid_audio','invalid_variant','invalid_delivery','active_membership_required','insufficient_points','duplicate_claim','duplicate_original','idempotency_conflict','invalid_transition','not_found','verification_required','stock_confirmation_required','evidence_required','shipping_payment_required','access_evidence_required','reason_required','terms_required']);
function createPointsStore({url,publicKey,serverKey,enabled=true,fetcher=fetch,staff=configuredCareAdmin()}={}){
 let origin;try{const u=new URL(url);if(u.protocol!=='https:'||! /^[a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error();origin=u.origin;}catch{return {ready:false};}
 if(!enabled||!publicKey||!serverKey||!staff.ready)return {ready:false};
 const headers={apikey:serverKey,...(!serverKey.startsWith('sb_secret_')?{Authorization:'Bearer '+serverKey}:{})};
 const rpc=async(name,body)=>{
  const r=await fetcher(origin+'/rest/v1/rpc/'+name,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(errors.has(e.message)?e.message:e.code==='23505'?'duplicate_original':'points_unavailable');}return r.json();
 };
 return {ready:true,
  async verifyMember(req){
   const authorization=req.headers?.authorization;if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(authorization))throw Error('member_login_required');
   const r=await fetcher(origin+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(10000)});
   if([401,403].includes(r.status))throw Error('member_login_required');if(!r.ok)throw Error('points_unavailable');
   const u=await r.json();if(!u.email_confirmed_at||u.is_anonymous===true||! /^[a-f0-9-]{36}$/i.test(u.id))throw Error('member_login_required');
   const identity=emailIdentity(u.email);return {emailHash:identity.emailHash,emailHint:identity.emailHint};
  },
  verifyStaff:req=>staff.verifyStaff(req),
  health:()=>rpc('fc_rewards_queue',{p_offset:0}).then(()=>true),
  status:member=>rpc('fc_rewards_status',{p_email_hash:member.emailHash}),
  member:(member,action,payload)=>rpc('fc_rewards_member',{p_email_hash:member.emailHash,p_email_hint:member.emailHint,p_action:action,p_payload:payload}),
  queue:offset=>rpc('fc_rewards_queue',{p_offset:offset}),
  query:email=>rpc('fc_rewards_status',{p_email_hash:emailIdentity(email).emailHash}),
  staff:(actor,payload)=>rpc('fc_rewards_staff',{p_actor:actor.id,p_actor_label:actor.label,p_payload:payload})
 };
}
function configuredPoints(env=process.env){return createPointsStore({url:env.FC_SUPABASE_URL,publicKey:env.FC_SUPABASE_PUBLISHABLE_KEY,serverKey:env.FC_SUPABASE_SERVER_KEY,enabled:env.FC_REWARDS_ENABLED!=='false'});}
module.exports={memberPayload,staffPayload,audio,createPointsStore,configuredPoints};
