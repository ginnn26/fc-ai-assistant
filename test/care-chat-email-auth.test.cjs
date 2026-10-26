const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
process.env.OPENAI_API_KEY = 'test-placeholder-not-a-real-key';
const { createEmailAuth } = require('../services/care-chat-email-auth');
const { createChatRouter } = require('../routes/chat');
const baseConfig = { url: 'https://example.supabase.co', publicKey: 'public-test', enabled: true, now: () => 1000000 };
const providerSession = { access_token: 'x'.repeat(40), refresh_token: 'refresh-token-fixture', expires_in: 3600,
  user: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email_confirmed_at: '2026-10-25', is_anonymous: false } };

test('email authentication stays closed until explicitly enabled on a pinned HTTPS project', () => {
  assert.equal(createEmailAuth().ready, false);
  assert.equal(createEmailAuth({ ...baseConfig, enabled: false }).ready, false);
  for (const url of ['https://other.test', 'http://example.supabase.co', 'https://user:pass@example.supabase.co', 'https://example.supabase.co/?x=1'])
    assert.equal(createEmailAuth({ ...baseConfig, url }).ready, false);
});
test('OTP, verification and refresh call the configured project and return no user profile', async () => {
  const requests = [];
  const auth = createEmailAuth({ ...baseConfig, fetcher: async (url, options) => {
    requests.push({ url, options }); return Response.json(url.endsWith('/otp') ? {} : providerSession);
  } });
  await auth.requestCode('fixture@example.test');
  const session = await auth.verifyCode('fixture@example.test', '123456');
  assert.deepEqual(Object.keys(session).sort(), ['accessToken', 'expiresAt', 'refreshToken']);
  assert.equal(session.expiresAt, 4600);
  await auth.refresh(session.refreshToken);
  assert.equal(requests[0].url, baseConfig.url + '/auth/v1/otp');
  assert.deepEqual(JSON.parse(requests[0].options.body), { email: 'fixture@example.test', create_user: true });
  assert.equal(requests[1].url, baseConfig.url + '/auth/v1/verify');
  assert.equal(JSON.parse(requests[1].options.body).type, 'email');
  assert.equal(requests[2].url, baseConfig.url + '/auth/v1/token?grant_type=refresh_token');
  assert.ok(requests.every(r => r.options.redirect === 'error'));
});
test('unconfirmed users, anonymous accounts and malformed provider sessions never authenticate', async () => {
  for (const data of [{}, { ...providerSession, user: { ...providerSession.user, is_anonymous: true } },
    { ...providerSession, user: { ...providerSession.user, email_confirmed_at: null } },
    { ...providerSession, expires_in: -1 }, { ...providerSession, access_token: 'bad' }]) {
    const auth = createEmailAuth({ ...baseConfig, fetcher: async () => Response.json(data) });
    await assert.rejects(auth.verifyCode('fixture@example.test', '123456'), /email_auth_unavailable/);
  }
});
test('provider rate limits and mail failures are bounded, sanitized and not retried', async () => {
  let calls = 0;
  const auth = createEmailAuth({ ...baseConfig, fetcher: async () => {
    calls++; return new Response('PRIVATE_SMTP_ERROR_DETAILS', { status: 429 });
  } });
  await assert.rejects(auth.requestCode('fixture@example.test'), /auth_please_wait/);
  assert.equal(calls, 1);
});

test('rejected verification codes have a safe distinct error without exposing provider details', async () => {
  const auth = createEmailAuth({ ...baseConfig, fetcher: async () =>
    new Response('PRIVATE_PROVIDER_CODE_OR_PROFILE', { status: 403 }) });
  await assert.rejects(auth.verifyCode('fixture@example.test', '123456'), /^Error: invalid_or_expired_code$/);
  await assert.rejects(auth.requestCode('fixture@example.test'), /^Error: email_auth_unavailable$/);
});

test('revoked refresh tokens require sign-in while a provider outage remains recoverable', async () => {
  for (const status of [400, 401, 403, 422, 500]) {
    const auth = createEmailAuth({ ...baseConfig, fetcher: async () => new Response('PRIVATE_PROVIDER_DETAILS', { status }) });
    await assert.rejects(auth.refresh('fixture-refresh-token'), status === 500 ? /email_auth_unavailable/ : /member_login_required/);
  }
});
test('sign out revokes the local provider session without requiring a backend admin key', async () => {
  const auth = createEmailAuth({ ...baseConfig, fetcher: async (url, options) => {
    assert.equal(url, baseConfig.url + '/auth/v1/logout?scope=local');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(null, { status: 204 });
  } });
  await auth.signOut('test-token');
});
test('mounted auth routes validate email/code, reject foreign origins and keep provider failures private', async () => {
  let calls = 0;
  const app = express(); app.use(express.json({ limit: '12kb' }));
  app.use('/chat', createChatRouter({ memberBudget: { ready: true }, emailAuth: { ready: true,
    requestCode: async () => { calls++; }, verifyCode: async () => { throw Error('PRIVATE_PROVIDER_DETAILS'); },
    signOut: async () => { calls++; } } }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, origin = base, extra = {}) => fetch(base + '/chat/auth/' + path, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('request-code', { email: 'not-an-email' })).status, 422);
    assert.equal((await post('request-code', { email: 'fixture@example.test' }, 'https://evil.test')).status, 403);
    assert.equal(calls, 0);
    assert.equal((await post('request-code', { email: 'fixture@example.test' })).status, 200);
    assert.equal(calls, 1);
    assert.equal((await post('verify-code', { email: 'fixture@example.test', code: 'not-a-code' })).status, 422);
    const response = await post('verify-code', { email: 'fixture@example.test', code: '123456' });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'email_auth_unavailable' });
    assert.equal((await post('logout', {}, base, { Authorization: 'Bearer ' + 'x'.repeat(40) })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
