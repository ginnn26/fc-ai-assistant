const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const allowance=n=>({remainingTextAttempts:n,includedTextAttempts:n,purchasedTextAttempts:0});
const settle=()=>new Promise(r=>setImmediate(r));

// Run the real capture and conversation modules together with fictional audio,
// Auth and responses. Nothing reaches email, OpenAI or the production ledger.
async function fixture({units=140,transcribe,chat}={}){
 const elements=new Map(),listeners=new Map(),calls=[];let capture,stopped=0;
 const el=id=>{
  if(!elements.has(id))elements.set(id,{value:'',checked:false,hidden:false,disabled:false,children:[],textContent:'',
   scrollTop:0,scrollHeight:400,clientHeight:400,offsetTop:0,style:{setProperty(){}},classList:{toggle(){}},
   focus(){this.focused=true;},pause(){},removeAttribute(){},
   replaceChildren(...nodes){this.children=nodes;this.lastElementChild=nodes.at(-1);if(this.lastElementChild)this.lastElementChild.offsetTop=100;}});
  return elements.get(id);
 };
 class Context{constructor(){this.sampleRate=16000;this.audioWorklet={addModule:async()=>{}};this.destination={};}createMediaStreamSource(){return{connect(){},disconnect(){}};}async resume(){}async close(){}}
 class Worklet{constructor(){capture=this;this.port={postMessage(){}};}connect(){}disconnect(){}}
 const auth={language(){},configure(){},signedIn:()=>true,headers:async()=>({Authorization:'Bearer fictional'}),requireSignIn(){}};
 const window={AudioContext:Context,AudioWorkletNode:Worklet,FCCareAuth:auth,
  addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
  dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e);}};
 const context=vm.createContext({window,document:{getElementById:el,documentElement:{},addEventListener(){},createElement:()=>({children:[],append(...nodes){this.children.push(...nodes);}})},
  navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++;}}]})}},
  fetch:async(url,options)=>{
   if(url==='/chat/features')return Response.json({conversation:true,emailLogin:true,voiceInput:true,allowanceStatus:true});
   if(url==='/chat/allowance')return Response.json({allowance:allowance(units)});
   calls.push({url,options});
   if(url==='/chat/voice-draft'){
    assert.equal(options.body.get('consent'),'true');
    const response=await (transcribe?transcribe(options):Response.json({transcript:'Fictional relaxing after work',allowance:allowance(--units)}));
    const data=await response.clone().json();if(Number.isInteger(data.allowance?.remainingTextAttempts))units=data.allowance.remainingTextAttempts;
    return response;
   }
   if(url==='/chat/conversation'){assert.equal(JSON.parse(options.body).consent,true);return chat?chat(options):Response.json({reply:'A fictional supportive reply',allowance:allowance(--units)});}
   throw Error('Unexpected request');
  },URL:Object.assign(class extends URL{}, {createObjectURL:()=> 'blob:fictional',revokeObjectURL(){}}),
  URLSearchParams,location:{search:''},Blob,FormData,AbortController,Event,CustomEvent,Float32Array,ArrayBuffer,DataView,TextEncoder,Date,
  setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){}});
 for(const file of ['care-chat-voice.js','care-chat.js'])vm.runInContext(fs.readFileSync(require.resolve('../public/'+file),'utf8'),context);
 await settle();await settle();
 async function record(){await el('record-voice').onclick();capture.port.onmessage({data:{samples:new Float32Array(16000).fill(.1)}});await el('record-voice').onclick();capture.port.onmessage({data:{done:true}});}
 return {el,window,calls,record,stopped:()=>stopped,submit:()=>el('chat-form').onsubmit({preventDefault(){}})};
}

test('one explicit voice send converts then chats once, without review or duplicate uploads',async()=>{
 let resolve;
 const f=await fixture({transcribe:()=>new Promise(r=>{resolve=r;})});
 await f.record();assert.equal(f.stopped(),1);assert.equal(f.calls.length,0);
 assert.equal(f.el('send').disabled,false);assert.match(f.el('send').textContent,/2/);
 await f.submit();assert.equal(f.calls.length,0); // Consent is still affirmative.
 f.el('consent').checked=true;const pending=f.submit();await settle();
 await f.submit();await f.el('convert-voice').onclick();
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft']);
 resolve(Response.json({transcript:'Fictional relaxing after work',allowance:allowance(139)}));await pending;
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft','/chat/conversation']);
 assert.equal(JSON.parse(f.calls[1].options.body).turns.at(-1).content,'Fictional relaxing after work');
 assert.equal(f.el('messages').children.length,2);assert.equal(f.el('message').value,'');
  assert.match(f.el('allowance-summary').textContent,/138/);
 assert.equal(f.el('message').focused,undefined);
});

test('optional preview only converts, retains editable text and requires a later send',async()=>{
 const f=await fixture();await f.record();f.el('consent').checked=true;await f.el('convert-voice').onclick();
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft']);
 assert.match(f.el('message').value,/Fictional/);assert.equal(f.el('message').focused,true);
 await settle();await f.submit();assert.equal(f.calls.at(-1).url,'/chat/conversation');
});

test('failed conversion never chats or retries automatically',async()=>{
 const f=await fixture({transcribe:()=>Response.json({error:'speech_not_clear',allowance:allowance(139)},{status:422})});
 await f.record();f.el('consent').checked=true;await f.submit();await settle();
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft']);assert.equal(f.el('messages').children.length,0);
 assert.match(f.el('voice-status').textContent,/没有听清楚/);
});

test('failed chat after conversion preserves its transcript and never retranscribes',async()=>{
 const f=await fixture({chat:()=>Response.json({error:'temporarily_unavailable'},{status:503})});
 await f.record();f.el('consent').checked=true;await f.submit();await settle();
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft','/chat/conversation']);
 assert.match(f.el('message').value,/Fictional/);assert.match(f.el('error').textContent,/暂时/);
});

for(const action of ['clear','signout'])test(`${action} during conversion prevents a late automatic chat send`,async()=>{
 let resolve;const f=await fixture({transcribe:()=>new Promise(r=>{resolve=r;})});
 await f.record();f.el('consent').checked=true;const pending=f.submit();await settle();
 if(action==='clear')f.el('clear').onclick();else f.window.dispatchEvent(new Event('fc-care-auth-changed'));
 resolve(Response.json({transcript:'Old account fictional transcript',allowance:allowance(139)}));await pending;await settle();
 assert.deepEqual(f.calls.map(c=>c.url),['/chat/voice-draft']);assert.equal(f.el('message').value,'');assert.equal(f.el('messages').children.length,0);
});

test('one remaining unit keeps voice closed while allowing a typed send',async()=>{
 const f=await fixture({units:1});assert.equal(f.el('record-voice').disabled,true);assert.equal(f.el('send').disabled,false);
 await f.el('record-voice').onclick();assert.equal(f.calls.length,0);assert.equal(f.window.FCCareVoice.readyToSend(),false);
});
