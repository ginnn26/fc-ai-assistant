const test = require('node:test');
const assert = require('node:assert/strict');
process.env.OPENAI_API_KEY ||= 'test-placeholder-not-a-real-key';
const { run } = require('../evals/run-care-chat.cjs');
const { answerConversation, prepareConversation, CANDIDATE_MODEL } = require('../services/care-chat');

test('fictional comparison plan covers both models and does not fabricate quality results or call a provider', async () => {
  const result = await run();
  assert.equal(result.rows.length, 30);
  assert.equal(result.callsAttempted, 0);
  assert.equal(result.reservedSen, 0);
  assert.equal(result.realModelQualityVerified, false);
  assert.ok(result.rows.every(row => row.routePassed && !row.realModelCalled && row.humanQualityReview === 'pending'));
});

test('unified evaluation includes catalog decisions and forwards the final structured-output cap without spending',async()=>{
  const plan=await run({unified:true});assert.equal(plan.rows.length,16);
  assert.equal(plan.callsAttempted,0);assert.ok(plan.rows.every(row=>row.routePassed));
  let structured=0;
  const simulated=await run({unified:true,maxPaidCalls:2,simulateResponse:async request=>{
    assert.equal(request.max_output_tokens,200);
    if(request.text?.format?.type==='json_schema')structured++;
    return {status:'completed',output_text:JSON.stringify({reply:'A fictional kind reply.',ids:[]}),usage:{input_tokens:100,output_tokens:30}};
  }});
  assert.equal(structured,2);assert.equal(simulated.callsAttempted,2);
  assert.equal(simulated.realModelQualityVerified,false);
});

test('candidate selection stays server-side and unsupported models fail before a paid call', async () => {
  let calls = 0, model;
  const prepared = prepareConversation([{ role: 'user', content: 'I just want someone to listen.' }], 'en');
  const ask = async (_, options) => { calls++; model = options.model; return 'Take your time. You can share as much or as little as feels right.'; };
  await answerConversation(prepared, { ask, model: CANDIDATE_MODEL });
  assert.equal(model, 'gpt-5.4-mini');
  await assert.rejects(answerConversation(prepared, { ask, model: 'unbudgeted-model' }), /unsupported_chat_model/);
  assert.equal(calls, 1);
});

test('an oversized model reply cannot poison the next turn beyond the accepted conversation bounds', async () => {
  const prepared = prepareConversation([{ role: 'user', content: 'A fictional day.' }]);
  await assert.rejects(answerConversation(prepared, { ask: async () => 'x'.repeat(1201) }), /invalid_chat_response/);
});

test('cost estimates require real counters and never double-count reasoning tokens or guess missing usage', () => {
  const { estimateTextCost } = require('../evals/care-chat-costs.cjs');
  const cost = estimateTextCost('gpt-5.4-mini', {input_tokens:1000,output_tokens:100,
    output_tokens_details:{reasoning_tokens:80}});
  assert.ok(Math.abs(cost.estimatedUsd - 0.0012) < 1e-12);
  for (const usage of [null,{}, {input_tokens:-1,output_tokens:2}, {input_tokens:1.5,output_tokens:2}])
    assert.equal(estimateTextCost('gpt-5.4-mini',usage),null);
  assert.equal(estimateTextCost('unpriced-model',{input_tokens:1,output_tokens:1}),null);
});

test('a partial evaluation balances both models, preserves results and never exceeds its reservation budget', async () => {
  let calls=0;
  const result=await run({maxPaidCalls:2,budgetSen:20,simulateResponse:async input=>{
    calls++; assert.equal(input.store,false);assert.equal(input.reasoning.effort,'none');
    return {status:'completed',output_text:'A fictional supportive reply.',usage:{input_tokens:100,output_tokens:20}};
  }});
  assert.equal(calls,2);assert.equal(result.rows.length,30);assert.equal(result.reservedSen,20);
  assert.equal(result.mode,'simulated-provider-no-real-calls');
  assert.equal(result.costs[0].attempted,1);assert.equal(result.costs[1].attempted,1);
  assert.ok(result.rows.some(row=>row.outcome==='not-run-budget'));
  assert.ok(result.rows.every(row=>!row.realModelCalled));
  assert.equal(result.realModelQualityVerified,false);
});

test('provider failures retain reservations and remain unknown cost, never a fake passing AI reply', async () => {
  let calls=0;
  const result=await run({maxPaidCalls:2,budgetSen:20,simulateResponse:async()=>{calls++;throw Error('secret must never appear');}});
  assert.equal(calls,2);assert.equal(result.reservedSen,20);
  const failures=result.rows.filter(row=>row.outcome==='provider-failed');
  assert.equal(failures.length,2);assert.ok(failures.every(row=>row.reply===null && !row.routePassed));
  assert.equal(result.costs.reduce((n,row)=>n+row.costUnknownAttempts,0),2);
  assert.equal(JSON.stringify(result).includes('secret must never appear'),false);
});

test('incomplete, empty and oversized replies do not abort or fabricate the comparison', async () => {
  let calls=0;
  const result=await run({maxPaidCalls:4,budgetSen:40,simulateResponse:async()=>{
    calls++;return calls===1?{status:'incomplete',output_text:'truncated'}:
      {status:'completed',output_text:calls===2?'':calls===3?'x'.repeat(1201):'Usable fictional reply'};
  }});
  assert.equal(result.rows.length,30);assert.equal(calls,4);
  assert.equal(result.rows.filter(row=>row.outcome==='incomplete-response').length,1);
  assert.equal(result.rows.filter(row=>row.outcome==='invalid-response').length,2);
  assert.equal(result.rows.filter(row=>row.providerAttempted&&row.reply!==null).length,1);
});

test('an unexpected usage overrun stops further provider calls and test knobs cannot increase approved spending', async () => {
  let calls=0;
  const result=await run({simulateResponse:async()=>{calls++;return {status:'completed',output_text:'Fixture reply',
    usage:{input_tokens:1000000,output_tokens:1}};}});
  assert.equal(calls,1);assert.equal(result.rows.filter(row=>row.reservationOverrun).length,1);
  await assert.rejects(run({maxPaidCalls:21}),/cannot exceed/);
  await assert.rejects(run({budgetSen:201}),/cannot exceed/);
  await assert.rejects(run({live:true,simulateResponse:async()=>{}}),/Simulation cannot/);
});

test('authentication, permission and provider credit failures stop paid evaluation after one attempt', async () => {
  for (const status of [401,403,429]) {
    let calls=0;
    const result=await run({simulateResponse:async()=>{calls++;const error=Error('private detail');error.status=status;throw error;}});
    assert.equal(calls,1);assert.equal(result.reservedSen,10);
    assert.equal(result.rows.filter(row=>row.outcome==='provider-failed').length,1);
    assert.equal(result.costs.reduce((sum,row)=>sum+row.costUnknownAttempts,0),1);
  }
});

test('targeted follow-up covers corrected behavior and seven-turn conversations under the input envelope', async () => {
  let calls=0,maxBytes=0;
  const result=await run({followup:true,maxPaidCalls:10,budgetSen:100,simulateResponse:async input=>{
    calls++;maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(input.input),'utf8'));
    return {status:'completed',output_text:'A fictional supportive reply.',usage:{input_tokens:800,output_tokens:100}};
  }});
  assert.equal(calls,10);assert.equal(result.rows.length,10);assert.equal(result.suite,'followup-short-and-long');
  assert.ok(result.rows.some(row=>row.id==='followup-long-zh'));assert.ok(result.rows.some(row=>row.id==='followup-long-en'));
  assert.ok(maxBytes>6000&&maxBytes<=12000);assert.equal(result.reservedSen,100);
  assert.equal(result.mode,'simulated-provider-no-real-calls');
});
