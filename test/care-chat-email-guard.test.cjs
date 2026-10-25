const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createEmailResendGuard } = require('../services/care-chat-email-guard');
const { createChatRouter } = require('../routes/chat');

test('resend protection normalizes case, isolates addresses and releases only at the boundary', () => {
  let time = 0; const guard = createEmailResendGuard({ now: () => time });
  assert.equal(guard.reserve('Person@example.test').allowed, true);
  time = 59001;
  assert.deepEqual(guard.reserve(' person@EXAMPLE.test '), { allowed: false, retryAfter: 1 });
  assert.equal(guard.reserve('other@example.test').allowed, true);
  time = 60000; assert.equal(guard.reserve('person@example.test').allowed, true);
});

test('resend guard bounds memory without evicting active cooldowns', () => {
  let time = 0; const guard = createEmailResendGuard({ now: () => time, maxEntries: 2 });
  guard.reserve('a@example.test'); guard.reserve('b@example.test');
  assert.deepEqual(guard.reserve('c@example.test'), { allowed: false, retryAfter: 60 });
  assert.equal(guard.reserve('a@example.test').allowed, false);
  time = 60000; assert.equal(guard.reserve('c@example.test').allowed, true);
});

test('direct and parallel code requests cannot bypass cooldown after a provider failure', async () => {
  let calls = 0, time = Date.parse('2026-10-26T00:00:00Z');
  const app = express(); app.use(express.json());
  app.use('/chat', createChatRouter({ now: () => time, memberBudget: { ready: true },
    emailAuth: { ready: true, requestCode: async () => { calls++; throw Error('private provider error'); } } }));
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = email => fetch(base+'/chat/auth/request-code',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email})});
  try {
    const responses = await Promise.all([post('Person@example.test'),post('person@EXAMPLE.test')]);
    assert.deepEqual(responses.map(r=>r.status).sort(),[429,503]); assert.equal(calls,1);
    const blocked = await post('person@example.test'); assert.equal(blocked.headers.get('Retry-After'),'60');
    assert.deepEqual(await blocked.json(),{error:'auth_please_wait'});
    assert.equal((await post('other@example.test')).status,503); assert.equal(calls,2);
    time += 60000; assert.equal((await post('person@example.test')).status,503); assert.equal(calls,3);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});

test('private pilot mail prefilter does not leak roster membership or spend mail calls on arbitrary addresses',async()=>{
 let calls=0;const app=express();app.use(express.json());
 app.use('/chat',createChatRouter({memberBudget:{ready:true,canRequestCode:email=>email==='invited@example.test'},
 emailAuth:{ready:true,requestCode:async()=>{calls++;}}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const email of ['other@example.test','invited@example.test']){
   const response=await fetch(base+'/chat/auth/request-code',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email})});
   assert.equal(response.status,200);assert.deepEqual(await response.json(),{sent:true});
  }
  assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
