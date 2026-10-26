'use strict';
const crypto = require('node:crypto');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function emailIdentity(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw Error('invalid_email');
  const email=value.trim().toLowerCase(), [local,domain]=email.split('@');
  return {email, emailHash:hash(email), emailHint:local[0]+'***@'+domain};
}
function localDay(value, end=false) {
  if(typeof value!=='string'||!/^20\d\d-\d{2}-\d{2}$/.test(value))throw Error('invalid_dates');
  const [y,m,d]=value.split('-').map(Number), midnight=Date.UTC(y,m-1,d);
  if(new Date(midnight).toISOString().slice(0,10)!==value)throw Error('invalid_dates');
  return new Date(midnight-8*3600000+(end?86400000:0)).toISOString();
}
function prepareChange(body) {
  const identity=emailIdentity(body?.email), action=body.action;
  if(!['activate','renew','cancel_at_end','revoke','restore','correct','confirm_audio'].includes(action))throw Error('invalid_action');
  if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion<0)throw Error('invalid_revision');
  if(typeof body.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId))throw Error('invalid_request');
  const payload={email_hash:identity.emailHash,email_hint:identity.emailHint,action,expected_version:body.expectedVersion,request_id:body.requestId};
  if(['activate','renew','correct'].includes(action)) {
    if(!['monthly','half_year','annual'].includes(body.plan)||body.paymentConfirmed!==true)throw Error('payment_confirmation_required');
    const from=localDay(body.startDay), until=localDay(body.lastDay,true);
    if(Date.parse(until)<=Date.parse(from)||Date.parse(until)-Date.parse(from)>3660*86400000)throw Error('invalid_dates');
    const reference=typeof body.paymentReference==='string'?body.paymentReference.trim().toLowerCase():'';
    if(reference.length<3||reference.length>128||/[\x00-\x1f]/.test(reference))throw Error('payment_reference_required');
    Object.assign(payload,{plan:body.plan,paid_from:from,paid_until:until,reference_hash:hash(reference),reference_hint:reference.slice(-6)});
  }
  if(action==='confirm_audio'){
    if(typeof body.audioActive!=='boolean')throw Error('audio_confirmation_required');
    payload.audio_active=body.audioActive;
  }
  if(['revoke','restore'].includes(action)) {
    const approval=typeof body.approvalReference==='string'?body.approvalReference.trim():'';
    if(body.managerApproved!==true||approval.length<3||approval.length>128)throw Error('manager_approval_required');
    payload.approval_hash=hash(approval);payload.approval_hint=approval.slice(-6);
  }
  return payload;
}
function createCareAdminStore({url,publicKey,serverKey,staffHashes=[],staffLabels={},enabled=false,fetcher=fetch,now=Date.now}={}) {
  let origin;
  try {const u=new URL(url);if(u.protocol!=='https:'||! /^[a-z0-9]+\.supabase\.co$/.test(u.hostname)||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error();origin=u.origin;}catch{return{ready:false};}
  if(!enabled||!publicKey||!serverKey||!staffHashes.length||staffHashes.length>30||staffHashes.some(v=>!/^[a-f0-9]{64}$/.test(v)))return{ready:false};
  const staff=new Set(staffHashes);
  const serverHeaders={apikey:serverKey,...(!serverKey.startsWith('sb_secret_')?{Authorization:'Bearer '+serverKey}:{})};
  const rpc=async(name,body)=>{
    const response=await fetcher(origin+'/rest/v1/rpc/'+name,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{...serverHeaders,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      const known=['revision_conflict','duplicate_payment_reference','invalid_membership_transition','idempotency_conflict'];
      throw Error(known.includes(error.message)?error.message:'admin_store_unavailable');
    }
    return response.json();
  };
  return {ready:true,
    canRequestCode(email){try{return staff.has(emailIdentity(email).emailHash);}catch{return false;}},
    async verifyStaff(req){
      const authorization=req.headers?.authorization;
      if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(authorization))throw Error('staff_login_required');
      const response=await fetcher(origin+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(10000)});
      if([401,403].includes(response.status))throw Error('staff_login_required');
      if(!response.ok)throw Error('admin_store_unavailable');
      const user=await response.json();
      let identity;try{identity=emailIdentity(user.email);}catch{throw Error('staff_access_denied');}
      if(!user.email_confirmed_at||user.is_anonymous===true||! /^[a-f0-9-]{36}$/i.test(user.id)||!staff.has(identity.emailHash))throw Error('staff_access_denied');
      const signedIn=Date.parse(user.last_sign_in_at);
      if(!Number.isFinite(signedIn)||now()-signedIn>2*3600000||signedIn>now()+60000)throw Error('staff_reauthentication_required');
      return {id:user.id,label:String(staffLabels[identity.emailHash]||'Staff '+identity.emailHash.slice(0,8)).slice(0,60)};
    },
    async query(email){return rpc('fc_admin_membership_query',{p_email_hash:emailIdentity(email).emailHash});},
    async tasks(offset=0){if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw Error('invalid_request');return rpc('fc_admin_membership_tasks',{p_offset:offset});},
    async save(actor,payload){return rpc('fc_admin_membership_save',{p_actor:actor.id,p_actor_label:actor.label,p_payload:payload});},
  };
}
function configuredCareAdmin(env=process.env){
  let labels={};try{labels=JSON.parse(env.FC_CARE_ADMIN_STAFF_LABELS||'{}');if(!labels||Array.isArray(labels)||typeof labels!=='object')throw Error();}catch{return{ready:false};}
  return createCareAdminStore({url:env.FC_SUPABASE_URL,publicKey:env.FC_SUPABASE_PUBLISHABLE_KEY,serverKey:env.FC_SUPABASE_SERVER_KEY,
    staffHashes:String(env.FC_CARE_ADMIN_STAFF_EMAIL_HASHES||'').split(',').map(v=>v.trim()),staffLabels:labels,enabled:env.FC_CARE_ADMIN_ENABLED==='true'});
}
module.exports={emailIdentity,localDay,prepareChange,createCareAdminStore,configuredCareAdmin};
