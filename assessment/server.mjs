import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createReport,InputError} from './lib/report.mjs';
const assets=new Map([
 ['/assessment/',['index.html','text/html; charset=utf-8']],
 ['/assessment/app.mjs',['app.mjs','text/javascript; charset=utf-8']],
 ['/assessment/schema.mjs',['schema.mjs','text/javascript; charset=utf-8']],
 ['/assessment/style.css',['style.css','text/css; charset=utf-8']],
 ['/assessment/cover.webp',['cover.webp','image/webp']]
]);
const fixedHeaders={
 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://frequencies-clinic.learnworlds.com",
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()'
};
export function makeServer({origin='',maxRequests=20,windowMs=600_000}={}){
 const buckets=new Map();
 const server=http.createServer(async(req,res)=>{
  for(const [k,v] of Object.entries(fixedHeaders))res.setHeader(k,v);
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  const path=(req.url||'').split('?')[0];
  if(req.method==='GET'&&(path==='/'||path==='/assessment')){res.writeHead(302,{Location:'/assessment/'});return res.end();}
  if(req.method==='GET'&&path==='/health'){return send(200,{status:'ok',service:'fc-assessment',mode:'rules'});}
  if(req.method==='GET'&&assets.has(path)){
   const [file,type]=assets.get(path);
   try {const content=await readFile(new URL(`./public/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':type});return res.end(content);}catch{return send(500,{error:'asset_unavailable'});}
  }
  if(path==='/assessment/api/report'){
   if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'method_not_allowed'});}
   const requestOrigin=req.headers.origin;
   const allowed=origin||`http://${req.headers.host}`;
   if(requestOrigin!==allowed)return send(403,{error:'origin_not_allowed'});
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return send(415,{error:'json_required'});
   const now=Date.now();
   for(const [k,b] of buckets){if(b.until<=now)buckets.delete(k);}
   // Deliberately do not trust caller-supplied X-Forwarded-For. No answers or identifiers are logged.
   const key=req.socket.remoteAddress||'unknown';
   const bucket=buckets.get(key)||{count:0,until:now+windowMs};bucket.count++;buckets.set(key,bucket);
   if(bucket.count>maxRequests){res.setHeader('Retry-After',String(Math.ceil((bucket.until-now)/1000)));return send(429,{error:'please_wait'});}
   let bytes=0;const chunks=[];
   try{
    for await(const chunk of req){bytes+=chunk.length;if(bytes>24_000)return send(413,{error:'request_too_large'});chunks.push(chunk);}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'invalid_json'});}
    const report=createReport(input);
    return send(200,{...report,createdAt:new Date().toISOString()});
   }catch(e){if(e instanceof InputError)return send(422,{error:'invalid_answers',field:e.field});return send(500,{error:'report_unavailable'});}
  }
  return send(404,{error:'not_found'});
 });
 server.requestTimeout=15_000;server.headersTimeout=10_000;
 return server;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const host=process.env.HOST||'127.0.0.1';const port=Number(process.env.PORT||4318);const origin=process.env.PUBLIC_ORIGIN||'';
 if(!['127.0.0.1','localhost','::1'].includes(host)&&!/^https:\/\/[^/]+$/.test(origin))throw new Error('Set PUBLIC_ORIGIN to the confirmed HTTPS application origin before external deployment.');
 makeServer({origin}).listen(port,host,()=>console.log(`FC assessment preview: http://${host}:${port}/assessment/`));
}
