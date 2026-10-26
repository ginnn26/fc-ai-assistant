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

test('production pilot stays closed without an explicit server roster, regardless of valid Supabase keys',()=>{
 const env={FC_CARE_CHAT_ENABLED:'true',FC_SUPABASE_URL:config.url,FC_SUPABASE_PUBLISHABLE_KEY:config.publicKey,
 FC_SUPABASE_SERVER_KEY:config.serverKey,FC_CARE_CHAT_MEMBER_HASH_SECRET:'x'.repeat(32)};
 assert.equal(createConfiguredMemberBudget(env).ready,false);
 assert.equal(createConfiguredMemberBudget({...env,FC_CARE_CHAT_PILOT_EMAIL_HASHES:'not-a-hash'}).ready,false);
 assert.equal(createConfiguredMemberBudget({...env,FC_CARE_CHAT_PILOT_EMAIL_HASHES:'a'.repeat(64)}).ready,true);
});

test('confirmed mailbox ownership cannot impersonate an invited FC account through client claims',async()=>{
 const crypto=require('node:crypto');const allowed=crypto.createHash('sha256').update('invited@example.test').digest('hex');
 let email='other@example.test';
 const connection=createSupabaseChatStore({...config,eligibleEmailHashes:[allowed],fetcher:async()=>Response.json({id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',email,email_confirmed_at:'2026-10-26'})});
 await assert.rejects(connection.verifyMember({headers:{authorization:token},body:{email:'invited@example.test',eligible:true}}),/member_not_eligible/);
 email=' Invited@EXAMPLE.test ';
 assert.deepEqual(await connection.verifyMember({headers:{authorization:token}}),{subject:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'});
});

test('paid access checks only the Auth-confirmed email against the private RPC on every request', async () => {
  const hash = require('node:crypto').createHash('sha256').update('member@example.test').digest('hex');
  let eligible = true, checks = 0;
  const connection = createSupabaseChatStore({ ...config, requirePaidMembership: true, fetcher: async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: ' Member@EXAMPLE.test ', email_confirmed_at: '2026-10-26' });
    assert.equal(url, config.url + '/rest/v1/rpc/fc_chat_paid_membership');
    assert.equal(options.headers.apikey, config.serverKey);
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { p_email_hash: hash });
    checks++;
    return Response.json({ eligible });
  } });
  const req = { headers: { authorization: token }, body: { email: 'someone-else@example.test', paid: true } };
  assert.deepEqual(await connection.verifyMember(req), { subject: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
  eligible = false;
  await assert.rejects(connection.verifyMember(req), /member_not_eligible/);
  assert.equal(checks, 2); // No stale per-process eligibility cache after revocation.
});

test('paid lookup failures, malformed grants and absent canonical email never grant access', async () => {
  for (const result of [Response.json({ eligible: 'true' }), Response.json({}), new Response('', { status: 503 })]) {
    const connection = createSupabaseChatStore({ ...config, requirePaidMembership: true, fetcher: async url => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'member@example.test', email_confirmed_at: '2026-10-26' });
      return result;
    } });
    await assert.rejects(connection.verifyMember({ headers: { authorization: token } }), /member_verification_unavailable/);
  }
  let calls = 0;
  const missingEmail = createSupabaseChatStore({ ...config, requirePaidMembership: true, fetcher: async () => {
    calls++;
    return Response.json({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email_confirmed_at: '2026-10-26' });
  } });
  await assert.rejects(missingEmail.verifyMember({ headers: { authorization: token } }), /member_not_eligible/);
  assert.equal(calls, 1);
});

test('paid configuration selects the durable membership check without silently using the pilot roster', () => {
  const env = { FC_CARE_CHAT_ENABLED: 'true', FC_CARE_CHAT_ACCESS_MODE: 'paid', FC_SUPABASE_URL: config.url,
    FC_SUPABASE_PUBLISHABLE_KEY: config.publicKey, FC_SUPABASE_SERVER_KEY: config.serverKey,
    FC_CARE_CHAT_MEMBER_HASH_SECRET: 'x'.repeat(32) };
  assert.equal(createConfiguredMemberBudget(env).ready, true);
  assert.equal(typeof createConfiguredMemberBudget(env).canRequestCode, 'function');
  assert.equal(createConfiguredMemberBudget({ ...env, FC_CARE_CHAT_ACCESS_MODE: 'typo' }).ready, false);
});

test('team demo access requires verified Auth and keeps the ordinary durable wallet', async () => {
  const hash = require('node:crypto').createHash('sha256').update('demo@example.test').digest('hex');
  let user = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: ' Demo@EXAMPLE.test ', email_confirmed_at: '2026-10-26' };
  const calls = [];
  const connection = createSupabaseChatStore({ ...config, requirePaidMembership: true, demoEmailHashes: [hash],
    fetcher: async (url, options) => {
      calls.push(url);
      if (url.endsWith('/auth/v1/user')) return Response.json(user);
      if (url.endsWith('/fc_chat_paid_membership')) return Response.json({ eligible: false });
      assert.equal(url, config.url + '/rest/v1/rpc/fc_reserve_chat');
      assert.equal(JSON.parse(options.body).p_limit_sen, 700);
      return Response.json({ ok: true });
    } });
  const req = { headers: { authorization: token }, body: { email: 'demo@example.test', demo: true } };
  assert.equal(await connection.canRequestCode('demo@example.test'), true);
  assert.deepEqual(await connection.verifyMember(req), { subject: user.id });
  assert.equal(calls.some(url => url.endsWith('/fc_chat_paid_membership')), false);
  await connection.store.reserve({ member: 'a'.repeat(64), month: '2026-10', amountSen: 5, limitSen: 700, requestId: 'demo' });
  user = { ...user, email: 'other@example.test' };
  await assert.rejects(connection.verifyMember(req), /member_not_eligible/);
  user = { ...user, email: 'demo@example.test', is_anonymous: true };
  assert.equal(await connection.verifyMember(req), null);
  user = { ...user, is_anonymous: false, email_confirmed_at: null };
  assert.equal(await connection.verifyMember(req), null);
  assert.equal(await connection.verifyMember({ body: { email: 'demo@example.test' } }), null);
});

test('removing team demo eligibility returns the account to the paid check without changing wallet identity', async () => {
  const hash = require('node:crypto').createHash('sha256').update('demo@example.test').digest('hex');
  const subject = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const fetcher = async url => url.endsWith('/auth/v1/user')
    ? Response.json({ id: subject, email: 'demo@example.test', email_confirmed_at: '2026-10-26' })
    : Response.json({ eligible: false });
  const before = createSupabaseChatStore({ ...config, requirePaidMembership: true, demoEmailHashes: [hash], fetcher });
  assert.deepEqual(await before.verifyMember({ headers: { authorization: token } }), { subject });
  const after = createSupabaseChatStore({ ...config, requirePaidMembership: true, demoEmailHashes: [], fetcher });
  await assert.rejects(after.verifyMember({ headers: { authorization: token } }), /member_not_eligible/);
  assert.equal(await after.canRequestCode('demo@example.test'), false);
});

test('invalid demo configuration fails closed', () => {
  for (const demoEmailHashes of ['all', ['not-a-hash'], Array(31).fill('a'.repeat(64))]) {
    assert.equal(createSupabaseChatStore({ ...config, demoEmailHashes }).ready, false);
  }
  const env = { FC_CARE_CHAT_ENABLED: 'true', FC_CARE_CHAT_ACCESS_MODE: 'paid', FC_SUPABASE_URL: config.url,
    FC_SUPABASE_PUBLISHABLE_KEY: config.publicKey, FC_SUPABASE_SERVER_KEY: config.serverKey,
    FC_CARE_CHAT_MEMBER_HASH_SECRET: 'x'.repeat(32), FC_CARE_CHAT_DEMO_EMAIL_HASHES: 'invalid' };
  assert.equal(createConfiguredMemberBudget(env).ready, false);
});
