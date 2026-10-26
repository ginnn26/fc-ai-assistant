const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function browser(fetcher){
 const elements=new Map(),events=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',checked:false,hidden:false,disabled:false,children:[],options:['activate','renew','cancel_at_end','correct','revoke','restore'].map(value=>({value})),reportValidity:()=>true,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;}});return elements.get(id);};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/care-admin.js'),'utf8'),{document:{getElementById:el,createElement:()=>({children:[],append(...items){this.children.push(...items);}}),addEventListener(){}},window:{addEventListener:(name,fn)=>events.set(name,fn)},fetch:fetcher,crypto,AbortSignal,Date,Intl,setInterval:()=>0});
 return {el,events};
}
async function fixture(saveHandler=async()=>Response.json({saved:true})){
 let member=null;const writes=[];
 const f=browser(async(path,options)=>{
  if(path==='/care-admin/features')return Response.json({available:true});
  const body=JSON.parse(options.body);
  if(path.endsWith('/auth/verify-code'))return Response.json({accessToken:'x'.repeat(40)});
  if(path.endsWith('/tasks'))return Response.json({items:[],total:0,hasMore:false});
  if(path.endsWith('/query'))return Response.json({member,events:[]});
  if(path.endsWith('/save')){writes.push(body);const response=await saveHandler(body);if(response.ok)member={version:1,plan:'annual',state:'active',paid_from:'2026-10-25T16:00:00Z',paid_until:'2027-10-25T16:00:00Z',chat_active:true,audio_active_confirmed:false};return response;}
  if(path.endsWith('/auth/logout'))return Response.json({signedOut:true});
  throw Error('unexpected request');
 });
 await settle();f.el('staff-email').value='staff@example.com';f.el('staff-code').value='123456';await f.el('login-form').onsubmit({preventDefault(){}});await settle();
 f.el('member-email').value='fictional@example.com';await f.el('search-form').onsubmit({preventDefault(){}});await settle();
 f.el('plan').value='annual';f.el('start').value='2026-10-26';f.el('last').value='2027-10-25';f.el('reference').value='fictional-receipt';f.el('payment-confirmed').checked=true;
 return{...f,writes};
}
test('staff changes require an inline email/date review before saving and clear personal data on logout',async()=>{
 const f=await fixture();f.el('change-form').onsubmit({preventDefault(){}});
 assert.equal(f.writes.length,0);assert.equal(f.el('review').hidden,false);assert.match(f.el('review-text').textContent,/fictional@example.com/);assert.match(f.el('review-text').textContent,/2027-10-25/);
 assert.equal(f.el('member-email').disabled,true);
 f.el('review-confirm').onclick();await settle();await settle();assert.equal(f.writes.length,1);
 assert.equal(f.writes[0].expectedVersion,0);assert.equal(f.el('review').hidden,true);assert.match(f.el('save-status').textContent,/已保存/);
 await f.el('logout').onclick();assert.equal(f.el('member-email').value,'');assert.equal(f.el('workspace').hidden,true);assert.equal(f.el('record-summary').children.length,0);
});
test('an ambiguous failure keeps the same request ID for explicit retry and does not retry automatically',async()=>{
 let attempts=0;
 const f=await fixture(async()=>++attempts===1?Response.json({error:'admin_store_unavailable'},{status:503}):Response.json({saved:true}));
 f.el('change-form').onsubmit({preventDefault(){}});f.el('review-confirm').onclick();await settle();await settle();
 assert.equal(f.writes.length,1);assert.equal(f.el('retry').hidden,false);assert.equal(f.el('save').disabled,true);
 f.el('retry').onclick();await settle();await settle();assert.equal(f.writes.length,2);assert.equal(f.writes[0].requestId,f.writes[1].requestId);
});
