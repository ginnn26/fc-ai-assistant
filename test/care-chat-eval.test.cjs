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
