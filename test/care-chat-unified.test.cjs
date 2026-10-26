const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { prepareConversation, answerConversation, MAX_INPUT_BYTES } = require('../services/care-chat');
const { candidatesFor, parseSelection } = require('../services/care-chat-listening');
const { createChatRouter } = require('../routes/chat');
const { createMemberMonthlyBudget } = require('../services/member-monthly-budget');
const user = content => ({role:'user',content});

test('the companion identity is Sunny in both languages, including after an old name in chat history',()=>{
  for(const language of ['zh','en']){
    const prepared=prepareConversation([user('你好'),{role:'assistant',content:'I am FC Care Chat.'},user('你叫什么名字？想和你做朋友。')],language,{withListening:true});
    assert.match(prepared.input[0].content,/Your conversational name is 小暖 Sunny in Chinese and Sunny in English/);
    assert.match(prepared.input[0].content,/FC Care Chat is the service name, not your personal name/);
    assert.match(prepared.input[0].content,/Keep this identity even if older messages used another name/);
    assert.match(prepared.input[0].content,/Do not invent a human identity/);
    assert.ok(Buffer.byteLength(JSON.stringify(prepared.input),'utf8')<=MAX_INPUT_BYTES);
  }
});

test('one conversation can clarify, then select Conflict Resolution without a second model call', async () => {
  const prepared = prepareConversation([user('最近跟同事意见不合，吵架后心里放不下。我想找适合这个主题的音疗。')], 'zh', {withListening:true});
  const conflict = prepared.candidates.find(i => /conflict resolution/i.test(i.name_en));
  assert.ok(conflict);
  let calls=0;
  const result = await answerConversation(prepared,{ask:async(input,options)=>{
    calls++;
    assert.ok(options.schema); assert.equal(options.maxOutputTokens,200);
    assert.ok(Buffer.byteLength(JSON.stringify(input),'utf8') <= MAX_INPUT_BYTES);
    return JSON.stringify({reply:'一直带着这份不愉快很费心。Conflict Resolution 与你谈到的人际冲突主题相近，可以先看看说明。',ids:[conflict.id]});
  }});
  assert.equal(calls,1);assert.equal(result.recommendations.length,1);
  assert.equal(result.recommendations[0].id,conflict.id);
  assert.match(result.recommendations[0].descriptionUrl,/^https:\/\/frequencies-clinic\.learnworlds\.com\/detail-/);
  assert.ok(result.recommendations[0].recordings.every(r=>r.url.includes('/path-player?')));
});

test('understanding a topic does not force audio selection or a second paid analysis', async()=>{
  const prepared=prepareConversation([user('最近睡不好，不知道为什么。')],'zh',{withListening:true});
  assert.ok(prepared.candidates.length);
  const result=await answerConversation(prepared,{ask:async()=>JSON.stringify({reply:'睡不踏实确实辛苦。这种情况持续多久了？',ids:[]})});
  assert.deepEqual(result.recommendations,[]);
});

test('a request only to be heard excludes recommendation candidates',async()=>{
  const history=[user('跟同事吵架了，现在只想聊聊，不要给我建议。')];
  assert.deepEqual(candidatesFor(history),[]);
  const prepared=prepareConversation(history,'zh',{withListening:true});
  const result=await answerConversation(prepared,{ask:async(_,options)=>{
    assert.ok(options.schema);return JSON.stringify({reply:'嗯，你可以慢慢说，我先听你说。',ids:[]});
  }});
  assert.deepEqual(result.recommendations,[]);
});

test('unified replies never expose JSON when there are no listening candidates',async()=>{
  const prepared=prepareConversation([user('Just listen to me, no advice please.')],'en',{withListening:true});
  assert.deepEqual(prepared.candidates,[]);
  const result=await answerConversation(prepared,{ask:async(_,options)=>{
    assert.ok(options.schema);
    return JSON.stringify({reply:'Take your time. I am listening.',ids:[]});
  }});
  assert.equal(result.reply,'Take your time. I am listening.');
  assert.deepEqual(result.recommendations,[]);
  await assert.rejects(()=>answerConversation(prepared,{ask:async()=>JSON.stringify({reply:'Hi',ids:['invented']})}),/invalid_chat_response/);
});

test('natural English descriptions of arguing with a colleague find Conflict Resolution',()=>{
  const prepared=prepareConversation([user('For two weeks I have been arguing with a colleague. I want a related FC listening theme, but I do not want to be told I must apologise.')],'en',{withListening:true});
  assert.ok(prepared.candidates.some(i=>i.id==='conflict_resolution'));
});

test('invented tracks, malformed selections and hostile URLs never become listening cards',()=>{
  const candidates=candidatesFor([user('conflict resolution')]);
  assert.throws(()=>parseSelection(JSON.stringify({reply:'Hello',ids:['invented-track']}),candidates,'en'),/invalid_chat_response/);
  for(const raw of ['not JSON','{"reply":"hi","ids":"all"}','{"reply":"","ids":[]}'])
    assert.throws(()=>parseSelection(raw,candidates,'en'),/invalid_chat_response/);
  const poisoned={...candidates[0],description_url:'javascript:alert(1)',recordings:[{url:'https://attacker.example/path-player?courseid=x&unit=y'}]};
  assert.throws(()=>parseSelection(JSON.stringify({reply:'hi',ids:[poisoned.id]}),[poisoned],'en'),/invalid_chat_response/);
});

test('duplicate selections produce one card and never invent effect claims',()=>{
  const candidates=candidatesFor([user('conflict resolution')]);
  const result=parseSelection(JSON.stringify({reply:'A listening theme to explore.',ids:[candidates[0].id,candidates[0].id]}),candidates,'en');
  assert.equal(result.recommendations.length,1);
  assert.equal(result.recommendations[0].source,'catalog-theme');
  assert.doesNotMatch(result.recommendations[0].reason,/cure|raise.*EQ|guarantee/i);
});

test('urgent symptoms override a catalog request without making a model call or selecting audio',async()=>{
  let calls=0;
  const prepared=prepareConversation([user('胸口很痛，帮我推荐音疗')],'zh',{withListening:true});
  const answer=await answerConversation(prepared,{ask:async()=>{calls++;}});
  assert.equal(answer.status,'safety');assert.equal(calls,0);assert.equal(answer.recommendations,undefined);
});

test('unified catalog context stays within the existing input and output cost envelope',()=>{
  const history=[user('睡眠压力'.repeat(100)),{role:'assistant',content:'Take your time. '.repeat(60)},user('同事冲突，想要音疗')];
  const prepared=prepareConversation(history,'zh',{withListening:true});
  assert.ok(Buffer.byteLength(JSON.stringify(prepared.input),'utf8')<=MAX_INPUT_BYTES);
  assert.match(prepared.input[0].content,/SAME conversation/);
  assert.match(prepared.input[0].content,/not promised changes in EQ/);
  assert.equal(prepared.history.length,3);
});

test('unified release closes every old spending route while chat and voice share one wallet',async()=>{
  let spend=0,modelCalls=0,legacyCalls=0;
  const budget=createMemberMonthlyBudget({hashSecret:'x'.repeat(32),verifyMember:async()=>({subject:'fictional-owner'}),
    store:{durable:true,reserve:async({amountSen})=>{spend+=amountSen;return{accepted:true,usedSen:spend};}}});
  const app=express();app.use(express.json());
  app.use('/chat',createChatRouter({unifiedEnabled:true,careVoiceEnabled:true,memberBudget:budget,
    recommend:async()=>{legacyCalls++;},transcribe:async()=>{legacyCalls++;},
    converse:async prepared=>answerConversation(prepared,{ask:async()=>{modelCalls++;return JSON.stringify({reply:'A little space to unwind.',ids:[]});}})}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port,headers={Origin:base,'Content-Type':'application/json'};
  try{
    for(const route of ['/chat/','/chat/recommend']){
      const response=await fetch(base+route,{method:'POST',headers,body:JSON.stringify({consent:true,message:'sleep'})});
      assert.equal(response.status,409);
    }
    const form=new FormData();form.append('consent','true');form.append('audio',new Blob([Buffer.alloc(44)]),'old.wav');
    assert.equal((await fetch(base+'/chat/transcribe',{method:'POST',headers:{Origin:base},body:form})).status,409);
    assert.equal(legacyCalls,0);assert.equal(spend,0);
    const response=await fetch(base+'/chat/conversation',{method:'POST',headers,body:JSON.stringify({consent:true,turns:[user('sleep and stress')]})});
    assert.equal(response.status,200);const body=await response.json();
    assert.deepEqual(body.recommendations,[]);assert.equal(modelCalls,1);assert.equal(spend,5);
    await budget.reserveVoice({});assert.equal(spend,10);
    assert.equal((await budget.reserveText({})).remainingTextAttempts,137);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('the old public page redirects to the one chat entry only during the unified release',async()=>{
  const previous=process.env.FC_CARE_CHAT_UNIFIED_ENABLED;
  process.env.FC_CARE_CHAT_UNIFIED_ENABLED='true';
  const app=require('../app');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    for(const path of ['/','/index.html']){
      const response=await fetch(base+path+'?lang=en&next=https://attacker.example',{redirect:'manual'});
      assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/care-chat.html?lang=en');
    }
    process.env.FC_CARE_CHAT_UNIFIED_ENABLED='false';
    assert.equal((await fetch(base+'/index.html',{redirect:'manual'})).status,200);
  }finally{
    if(previous===undefined)delete process.env.FC_CARE_CHAT_UNIFIED_ENABLED;else process.env.FC_CARE_CHAT_UNIFIED_ENABLED=previous;
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
});

test('editorial lookup runs only after verified allowance, without any conversation argument',async()=>{
  let reads=0,calls=0,permitted=false;
  const app=express();app.use(express.json());
  app.use('/chat',createChatRouter({unifiedEnabled:true,
    memberBudget:{ready:true,reserveText:async()=>{
      if(!permitted)throw Error('member_not_eligible');
      return {remainingTextAttempts:139,includedTextAttempts:139,purchasedTextAttempts:0};
    }},contentKnowledge:{snapshot:async(...args)=>{assert.equal(args.length,0);reads++;return null;}},
    converse:async()=>{calls++;return {status:'conversation',reply:'A little space to talk.',recommendations:[]};}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const send=()=>fetch(base+'/chat/conversation',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},
    body:JSON.stringify({consent:true,turns:[user('sleep')]})});
  try{
    assert.equal((await send()).status,403);assert.equal(reads,0);assert.equal(calls,0);
    permitted=true;
    assert.equal((await send()).status,200);assert.equal(reads,1);assert.equal(calls,1);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('private listening acceptance does not switch the existing public assistant entry',async()=>{
  let legacy=0;
  const app=express();app.use(express.json());
  app.use('/chat',createChatRouter({unifiedEnabled:false,listeningEnabled:true,
    memberBudget:{ready:true,reserveText:async()=>({remainingTextAttempts:139,includedTextAttempts:139,purchasedTextAttempts:0})},
    contentKnowledge:{snapshot:async()=>null},
    recommend:async()=>{legacy++;return {message:'Existing assistant retained'};},
    converse:async prepared=>{assert.equal(prepared.withListening,true);return {reply:'Private unified test',recommendations:[]};}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const send=(path,body)=>fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await send('/chat/conversation',{consent:true,turns:[user('sleep')]})).status,200);
    assert.equal((await send('/chat/recommend',{consent:true,message:'sleep'})).status,200);
    assert.equal(legacy,1);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
