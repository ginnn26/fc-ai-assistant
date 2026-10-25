const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function providerFixture(response){let calls=0,request,settings;class FakeOpenAI{constructor(options){settings=options;this.responses={create:async input=>{calls++;request=input;return response;}};}}const scope={exports:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../services/openai'),'utf8'),{module:scope,exports:scope.exports,require:name=>{assert.equal(name,'openai');return FakeOpenAI;},process:{env:{OPENAI_API_KEY:'fictional-key-not-a-credential'}},Buffer});return {api:scope.exports,calls:()=>calls,request:()=>request,settings:()=>settings};}

test('Care Chat provider request uses bounded mini output, no reasoning or storage, and never retries',async()=>{
 const f=providerFixture({status:'completed',output_text:'A short reply'});
 assert.equal(await f.api.askOpenAI([{role:'user',content:'Fictional message'}],{model:'gpt-5.4-mini',maxOutputTokens:200,reasoningEffort:'none',requireCompleted:true}),'A short reply');
 assert.equal(f.request().model,'gpt-5.4-mini');assert.equal(f.request().max_output_tokens,200);
 assert.equal(f.request().reasoning.effort,'none');assert.equal(f.request().store,false);
 assert.equal(f.settings().maxRetries,0);assert.equal(f.calls(),1);
});

test('an incomplete paid response is never presented as a complete Care Chat answer',async()=>{
 const f=providerFixture({status:'incomplete',output_text:'An unfinished sentence'});
 await assert.rejects(f.api.askOpenAI('Fictional message',{model:'gpt-5.4-mini',maxOutputTokens:200,requireCompleted:true}),/incomplete_model_response/);
 assert.equal(f.calls(),1);
});

test('new completion requirements do not silently change the legacy assistant request policy',async()=>{
 const f=providerFixture({output_text:'Legacy reply'});
 assert.equal(await f.api.askOpenAI('Fictional legacy message'),'Legacy reply');
 assert.equal(f.request().model,'gpt-5.4-nano');assert.equal(f.request().max_output_tokens,1000);
 assert.equal(f.request().reasoning,undefined);
});
