const test = require('node:test');
const assert = require('node:assert/strict');
const { createSupabaseChatStore, createConfiguredMemberBudget } = require('../services/supabase-chat-store');
const config = { url: 'https://example.supabase.co', publicKey: 'public-test', serverKey: 'sb_secret_test' };
const token = 'Bearer ' + 'x'.repeat(40);

test('allowance lookup uses only the backend read RPC and never a reservation or public key', async () => {
  let calls = 0;
  const connection = createSupabaseChatStore({ ...config, fetcher: async (url, options) => {
    calls++;
    assert.equal(url, config.url + '/rest/v1/rpc/fc_chat_allowance');
    assert.equal(options.headers.apikey, config.serverKey);
    assert.deepEqual(JSON.parse(options.body), { p_member: 'a'.repeat(64), p_month: '2026-10' });
    return Response.json({ usedSen: 5, paidRemainingSen: 0 });
  } });
  assert.deepEqual(await connection.store.status({ member: 'a'.repeat(64), month: '2026-10' }), { usedSen: 5, paidRemainingSen: 0 });
  assert.equal(calls, 1);
});

test('unconfigured or unapproved chat cannot become active merely from a project URL', () => {
  assert.equal(createConfiguredMemberBudget({ FC_SUPABASE_URL: config.url }).ready, false);
  for (const url of ['http://example.supabase.co', 'https://attacker.test', 'https://example.supabase.co/?x=1', 'https://user:pass@example.supabase.co'])
    assert.equal(createSupabaseChatStore({ ...config, url }).ready, false);
});
test('identity comes from verified Auth server lookup, never browser email or decoded claims', async () => {
  let seen;
  const connection = createSupabaseChatStore({ ...config, fetcher: async (url, options) => {
    seen = { url, options };
    return Response.json({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email_confirmed_at: '2026-10-25', is_anonymous: false });
  } });
  const result = await connection.verifyMember({ headers: { authorization: token }, body: { email: 'forged@test.com' } });
  assert.deepEqual(result, { subject: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
  assert.equal(seen.url, config.url + '/auth/v1/user');
  assert.equal(seen.options.headers.Authorization, token);
  assert.equal(seen.options.headers.apikey, config.publicKey);
  assert.equal(seen.options.redirect, 'error');
});
test('invalid, unconfirmed and anonymous identities cannot obtain member allowance', async () => {
  for (const user of [{ id: 'wrong' }, { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email_confirmed_at: '2026-10-25', is_anonymous: true }]) {
    const connection = createSupabaseChatStore({ ...config, fetcher: async () => Response.json(user) });
    assert.equal(await connection.verifyMember({ headers: { authorization: token } }), null);
  }
  const connection = createSupabaseChatStore({ ...config, fetcher: async () => new Response('', { status: 401 }) });
  assert.equal(await connection.verifyMember({ headers: { authorization: token } }), null);
  assert.equal(await connection.verifyMember({ body: { email: 'forged@test.com' } }), null);
});
test('reserve uses backend-only RPC and does not retry after an uncertain database response', async () => {
  let calls = 0;
  const connection = createSupabaseChatStore({ ...config, fetcher: async (url, options) => {
    calls++;
    assert.equal(url, config.url + '/rest/v1/rpc/fc_reserve_chat');
    assert.equal(options.headers.apikey, config.serverKey);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(JSON.parse(options.body).p_limit_sen, 500);
    throw Error('timeout-after-commit');
  } });
  await assert.rejects(connection.store.reserve({ member: 'a'.repeat(64), month: '2026-10', amountSen: 5, limitSen: 500, requestId: 'test' }));
  assert.equal(calls, 1);
});
