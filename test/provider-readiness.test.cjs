const test = require('node:test');
const assert = require('node:assert/strict');
const { createProviderReadiness } = require('../services/provider-readiness');

test('readiness uses a shared cached free probe and exposes no account metadata', async () => {
  let calls = 0, clock = 0, finish;
  const logs = [];
  const check = createProviderReadiness({ now: () => clock, log: line => logs.push(line),
    probe: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const a = check(), b = check();
  assert.equal(calls, 1);
  finish({ data: { input_tokens: 4 }, response: { headers: new Headers({
    'openai-organization': 'org-fixture', 'openai-project': 'proj-fixture',
    'authorization': 'fictional-must-not-be-logged' }) } });
  assert.deepEqual(await a, await b);
  assert.equal((await check()).available, true);
  assert.equal(calls, 1);
  assert.match(logs[0], /organization=org-fixture project=proj-fixture/);
  assert.doesNotMatch(JSON.stringify(await check()), /org-fixture|proj-fixture|authorization/);
  assert.doesNotMatch(logs.join(''), /fictional-must-not/);
  clock = 600001;
  const next = check(); assert.equal(calls, 2);
  finish({data:{input_tokens:4}}); await next;
});

test('access, quota and network failures are sanitized, cached and recoverable', async () => {
  for (const [status, reason] of [[401,'authentication_or_access'],[403,'authentication_or_access'],
    [429,'quota_or_rate_limit'],[500,'temporarily_unavailable'],[undefined,'temporarily_unavailable']]) {
    let clock = 0, broken = true, calls = 0; const logs=[];
    const check = createProviderReadiness({ now:()=>clock, log:line=>logs.push(line), probe:async()=>{
      calls++; if(broken)throw Object.assign(Error('fictional-secret-error'),{status});
      return {data:{input_tokens:4},response:{headers:new Headers({'openai-organization':'unsafe arbitrary text'})}};
    }});
    assert.equal((await check()).reason,reason);
    assert.equal((await check()).available,false); assert.equal(calls,1);
    assert.doesNotMatch(logs.join(''),/fictional-secret-error/);
    broken=false;clock=60001;
    assert.equal((await check()).available,true);assert.equal(calls,2);
    assert.match(logs.at(-1),/organization=not_reported/);
  }
});

test('malformed successful provider payload is not reported healthy', async()=>{
  const check=createProviderReadiness({log:()=>{},probe:async()=>({data:{input_tokens:'4'}})});
  assert.equal((await check()).available,false);
});

test('public readiness returns dependency status while process health stays independent', async()=>{
  const provider=require('../services/openai'), original=provider.checkProviderReadiness;
  const app=require('../app'); const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try {
    provider.checkProviderReadiness=async()=>({available:false,reason:'quota_or_rate_limit'});
    const down=await fetch(base+'/service-readiness');
    assert.equal(down.status,503);assert.equal((await down.json()).available,false);
    assert.match(down.headers.get('cache-control'),/no-store/);
    assert.equal((await fetch(base+'/health')).status,200);
    provider.checkProviderReadiness=async()=>({available:true,check:'free_input_token_count'});
    const up=await fetch(base+'/service-readiness');assert.equal(up.status,200);
    assert.equal((await up.json()).available,true);
  } finally {provider.checkProviderReadiness=original;await new Promise(resolve=>server.close(resolve));}
});
