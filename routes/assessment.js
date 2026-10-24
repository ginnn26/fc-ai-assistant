const express=require('express');
const path=require('node:path');
const {createNarrator}=require('../services/assessment-ai');
const core=import('../assessment/lib/report.mjs');
const assets=path.join(__dirname,'../assessment/public');
const securityHeaders={
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://frequencies-clinic.learnworlds.com",
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
function createAssessmentRouter({origin, narrator=createNarrator(),maxRequests=20,windowMs=600_000}={}){
  const router=express.Router();const buckets=new Map();
  router.use((req,res,next)=>{for(const[k,v]of Object.entries(securityHeaders))res.setHeader(k,v);next();});
  router.get('/api/config',(_req,res)=>res.json({aiAvailable:narrator.available,mode:'test'}));
  router.post('/api/report',(req,res,next)=>{
    const configuredOrigin=origin||process.env.ASSESSMENT_ORIGIN||process.env.RENDER_EXTERNAL_URL;
    const allowedOrigin=configuredOrigin||(`http://${req.headers.host}`);
    if(req.headers.origin!==allowedOrigin)return res.status(403).json({error:'origin_not_allowed'});
    if(!req.is('application/json'))return res.status(415).json({error:'json_required'});
    const now=Date.now();for(const[k,v]of buckets)if(v.until<=now)buckets.delete(k);
    // Do not trust arbitrary forwarded-IP headers. Shared NAT/proxy users may share this conservative cap.
    const key=req.socket.remoteAddress||'unknown';const b=buckets.get(key)||{count:0,until:now+windowMs};b.count++;buckets.set(key,b);
    if(b.count>maxRequests){res.setHeader('Retry-After',String(Math.ceil((b.until-now)/1000)));return res.status(429).json({error:'please_wait'});}
    next();
  },express.json({limit:'24kb',strict:true}),async(req,res)=>{
    try{
      const {createReport}=await core;
      if(req.body.aiConsent!==undefined&&typeof req.body.aiConsent!=='boolean')return res.status(422).json({error:'invalid_answers',field:'aiConsent'});
      const report=createReport(req.body);
      let aiStatus=req.body.aiConsent===true?'unavailable':'not-requested';
      let narrative=null;
      if(req.body.aiConsent===true&&narrator.available&&report.status==='complete'&&!report.chestFollowup){try{narrative=await narrator.narrate(report);}catch{narrative=null;}if(narrative)aiStatus='complete';}
      res.json({...report,mode:narrative?'rules+ai':'rules',aiStatus,narrative,createdAt:new Date().toISOString()});
    }catch(error){
      if(error?.name==='Error'&&error?.field)return res.status(422).json({error:'invalid_answers',field:error.field});
      res.status(500).json({error:'report_unavailable'});
    }
  });
  router.all('/api/report',(_req,res)=>res.status(405).set('Allow','POST').json({error:'method_not_allowed'}));
  router.use(express.static(assets,{dotfiles:'deny',fallthrough:true,index:'index.html',redirect:true}));
  router.use((_req,res)=>res.status(404).json({error:'not_found'}));
  router.use((error,_req,res,_next)=>{
    const status=error.type==='entity.too.large'?413:error.type==='entity.parse.failed'?400:500;
    res.status(status).json({error:status===413?'request_too_large':status===400?'invalid_json':'report_unavailable'});
  });
  return router;
}
module.exports={createAssessmentRouter};
