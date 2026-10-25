const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise asynchronous browser state without emailing anyone or calling AI.
function browserFixture(file, fetcher, auth, storedSession) {
  const elements = new Map(), listeners = new Map(), saved = new Map(storedSession
    ? [['fc-care-chat-session-v1', JSON.stringify(storedSession)]] : []);
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', checked: false, hidden: false,
      disabled: false, textContent: '', children: [], reportValidity: () => true,
      focus() {}, replaceChildren(...nodes) { this.children = nodes; } });
    return elements.get(id);
  };
  const window = { FCCareAuth: auth,
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent: event => listeners.get(event.type)?.(event) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public', file), 'utf8'), {
    window, document: { getElementById: element, documentElement: {}, createElement: () => ({}) },
    localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    fetch: fetcher, AbortController, AbortSignal, Event, TextEncoder, setTimeout, clearTimeout,
    setInterval: () => 0, Date, console, URLSearchParams, location: { search: '' },
  });
  return { element, window, saved };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const submit = { preventDefault() {} };
const session = { accessToken: 'x'.repeat(40), refreshToken: 'fixture-refresh-token', expiresAt: Date.now() / 1000 + 3600 };

test('concurrent expired-session callers share one refresh instead of rotating the same token twice', async () => {
  let calls = 0, finish;
  const fresh = { ...session, accessToken: 'z'.repeat(40), refreshToken: 'new-refresh-token' };
  const f = browserFixture('care-chat-login.js', async () => { calls++; return new Promise(resolve => { finish = resolve; }); },
    undefined, { ...session, expiresAt: 1 });
  const first = f.window.FCCareAuth.headers(), second = f.window.FCCareAuth.headers();
  assert.equal(calls, 1);
  finish(Response.json(fresh));
  const results = await Promise.all([first, second]);
  assert.ok(results.every(value => value.Authorization === 'Bearer ' + fresh.accessToken));
  assert.equal(JSON.parse(f.saved.get('fc-care-chat-session-v1')).refreshToken, fresh.refreshToken);
});

test('temporary refresh failure preserves the session; a later explicit request can recover', async () => {
  let working = false;
  const f = browserFixture('care-chat-login.js', async () => working ? Response.json(session)
    : Response.json({ error: 'email_auth_unavailable' }, { status: 503 }), undefined, { ...session, expiresAt: 1 });
  await assert.rejects(f.window.FCCareAuth.headers(), /auth_temporarily_unavailable/);
  assert.equal(f.window.FCCareAuth.signedIn(), true); assert.equal(f.saved.size, 1);
  working = true;
  assert.equal((await f.window.FCCareAuth.headers()).Authorization, 'Bearer ' + session.accessToken);
});

test('a provider-rejected refresh clears remembered login and requires verification again', async () => {
  const f = browserFixture('care-chat-login.js', async () =>
    Response.json({ error: 'member_login_required' }, { status: 401 }), undefined, { ...session, expiresAt: 1 });
  await assert.rejects(f.window.FCCareAuth.headers(), /member_login_required/);
  assert.equal(f.window.FCCareAuth.signedIn(), false); assert.equal(f.saved.size, 0);
});

test('a failed refresh belonging to an old session cannot sign out a newer verified login', async () => {
  let finish;
  const fresh = { ...session, accessToken: 'n'.repeat(40) };
  const f = browserFixture('care-chat-login.js', async url => url.endsWith('/refresh')
    ? new Promise(resolve => { finish = resolve; }) : Response.json(fresh), undefined, { ...session, expiresAt: 1 });
  f.window.FCCareAuth.configure({ emailLogin: true });
  const old = assert.rejects(f.window.FCCareAuth.headers(), /member_login_required/);
  f.window.FCCareAuth.requireSignIn();
  await f.element('login-form').onsubmit(submit);
  finish(Response.json({ error: 'member_login_required' }, { status: 401 })); await old;
  assert.equal(f.window.FCCareAuth.signedIn(), true);
  assert.equal((await f.window.FCCareAuth.headers()).Authorization, 'Bearer ' + fresh.accessToken);
});

test('remembered tabs clear their old session when another tab signs out or changes account', async () => {
  const f = browserFixture('care-chat-login.js', async () => { throw Error('must not call'); }, undefined, session);
  let changes = 0;
  f.window.addEventListener('fc-care-auth-changed', () => changes++);
  const fresh = { ...session, accessToken: 'a'.repeat(40), refreshToken: 'another-account-refresh' };
  f.saved.set('fc-care-chat-session-v1', JSON.stringify(fresh));
  f.window.dispatchEvent({ type: 'storage', key: 'fc-care-chat-session-v1' });
  assert.equal(changes, 1);
  assert.equal((await f.window.FCCareAuth.headers()).Authorization, 'Bearer ' + fresh.accessToken);
  f.saved.delete('fc-care-chat-session-v1');
  f.window.dispatchEvent({ type: 'storage', key: 'fc-care-chat-session-v1' });
  assert.equal(f.window.FCCareAuth.signedIn(), false); assert.equal(changes, 2);
});

test('late verification cannot sign a customer back in after sign-out', async () => {
  let finish;
  const f = browserFixture('care-chat-login.js', async () => new Promise(resolve => { finish = resolve; }));
  f.window.FCCareAuth.configure({ emailLogin: true });
  f.element('login-email').value = 'fixture@example.test'; f.element('login-code').value = '123456';
  f.element('remember-login').checked = true;
  const verifying = f.element('login-form').onsubmit(submit);
  f.window.FCCareAuth.requireSignIn();
  finish(Response.json(session)); await verifying;
  assert.equal(f.window.FCCareAuth.signedIn(), false);
  assert.equal(f.saved.size, 0);
  assert.equal(f.element('login-code').value, '');
});

test('sending a code prevents parallel requests and immediate resends without storing the code', async () => {
  let calls = 0, finish;
  const f = browserFixture('care-chat-login.js', async () => { calls++; return new Promise(resolve => { finish = resolve; }); });
  f.window.FCCareAuth.configure({ emailLogin: true });
  f.element('login-email').value = 'fixture@example.test';
  const sending = f.element('send-code').onclick();
  await f.element('send-code').onclick(); assert.equal(calls, 1);
  finish(Response.json({ sent: true })); await sending;
  assert.equal(f.element('send-code').disabled, true);
  assert.match(f.element('login-status').textContent, /有效付费会员/);
  f.window.FCCareAuth.language('en');
  assert.match(f.element('login-status').textContent, /active paid members/);
  assert.match(f.element('login-copy').textContent, /do not need a new email account/);
  await f.element('send-code').onclick(); assert.equal(calls, 1);
  assert.equal(f.saved.size, 0);
});

test('invalid-code feedback differs from service failure and tokens need explicit remember consent', async () => {
  let ok = false;
  const f = browserFixture('care-chat-login.js', async () => ok ? Response.json(session)
    : Response.json({ error: 'invalid_or_expired_code' }, { status: 422 }));
  f.window.FCCareAuth.configure({ emailLogin: true });
  await f.element('login-form').onsubmit(submit);
  assert.match(f.element('login-status').textContent, /过期/);
  f.window.FCCareAuth.language('en');
  assert.match(f.element('login-status').textContent, /incorrect or has expired/);
  ok = true; await f.element('login-form').onsubmit(submit);
  assert.equal(f.window.FCCareAuth.signedIn(), true);
  assert.equal(f.element('login-status').textContent, '');
  assert.equal(f.saved.size, 0);
});

test('mail-service failure remains translatable and sign-out clears the previous status', async () => {
  let calls = 0;
  const f = browserFixture('care-chat-login.js', async () => {
    calls++;
    return Response.json({ error: 'email_auth_unavailable' }, { status: 503 });
  });
  f.window.FCCareAuth.configure({ emailLogin: true });
  f.element('login-email').value = 'fixture@example.test';
  await f.element('send-code').onclick();
  assert.match(f.element('login-status').textContent, /暂时无法发送/);
  f.window.FCCareAuth.language('en');
  assert.match(f.element('login-status').textContent, /Unable to send right now/);
  f.window.FCCareAuth.language('zh');
  assert.match(f.element('login-status').textContent, /暂时无法发送/);
  f.window.FCCareAuth.requireSignIn();
  assert.equal(f.element('login-status').textContent, '');
  assert.equal(calls, 1);
});

async function chatFixture(response, voiceInput = false) {
  let calls = 0;
  const auth = { language() {}, configure() {}, signedIn: () => true, headers: async () => ({}) };
  const f = browserFixture('care-chat.js', async url => {
    if (url === '/chat/features') return Response.json({ conversation: true, emailLogin: true, voiceInput,
      monthlyAllowance: { includedTextAttempts: 100 } });
    calls++; return response();
  }, auth);
  auth.requireSignIn = () => f.window.dispatchEvent(new Event('fc-care-auth-changed'));
  await settle();
  f.element('message').value = 'A fictional day'; f.element('consent').checked = true;
  return { ...f, calls: () => calls };
}

test('the last send opens optional-pack details; clearing chat cannot reset a depleted allowance', async () => {
  const f = await chatFixture(() => Response.json({ reply: 'Fixture reply', allowance: { remainingTextAttempts: 0, includedTextAttempts: 0, purchasedTextAttempts: 0 } }));
  assert.match(f.element('allowance').textContent, /每月免费 100 次/);
  assert.doesNotMatch(f.element('allowance').textContent, /RM5|本钱|成本/);
  await f.element('chat-form').onsubmit(submit);
  assert.equal(f.element('send').disabled, true);
  assert.equal(f.element('extra-panel').hidden, false);
  f.element('clear').onclick();
  assert.equal(f.element('send').disabled, true);
  await f.element('chat-form').onsubmit(submit); assert.equal(f.calls(), 1);
  f.element('language').onclick();
  assert.match(f.element('allowance').textContent, /used/);
  assert.equal(f.element('extra-rules').href, '/care-chat-pack.html?lang=en');
});

test('a depleted-server response stops duplicate paid requests and translates its feedback', async () => {
  const f = await chatFixture(() => Response.json({ error: 'monthly_allowance_reached' }, { status: 429 }));
  await f.element('chat-form').onsubmit(submit);
  assert.equal(f.element('send').disabled, true);
  assert.equal(f.element('message').value, 'A fictional day');
  f.element('language').onclick();
  assert.match(f.element('error').textContent, /monthly chat allowance/);
});

test('a failed reply preserves the draft, does not auto-retry and does not claim the request was free', async () => {
  const f = await chatFixture(() => { throw Error('network down'); });
  await f.element('chat-form').onsubmit(submit);
  assert.equal(f.calls(), 1); assert.equal(f.element('message').value, 'A fictional day');
  assert.match(f.element('error').textContent, /可能会使用一次额度/);
  assert.equal(f.element('send').disabled, false);
});

async function statusFixture(responder) {
  const paths = [];
  let signedIn = true;
  const auth = { language() {}, configure() {}, signedIn: () => signedIn, headers: async () => ({}) };
  const f = browserFixture('care-chat.js', async url => {
    paths.push(url);
    if (url === '/chat/features') return Response.json({ conversation: true, emailLogin: true,
      allowanceStatus: true, monthlyAllowance: { includedTextAttempts: 100 } });
    if (url === '/chat/allowance') return responder();
    throw Error('must not call a paid endpoint');
  }, auth);
  auth.requireSignIn = () => { signedIn = false; f.window.dispatchEvent(new Event('fc-care-auth-changed')); };
  await settle();
  return { ...f, paths };
}

test('returning customers see actual free and purchased sends before sending; refresh never calls AI', async () => {
  const f = await statusFixture(() => Response.json({ allowance: {
    remainingTextAttempts: 102, includedTextAttempts: 97, purchasedTextAttempts: 5 } }));
  assert.match(f.element('allowance').textContent, /102/);
  assert.match(f.element('allowance-status').textContent, /免费剩余 97 次/);
  assert.equal(f.element('send').disabled, false);
  await f.element('refresh-allowance').onclick();
  assert.equal(f.paths.filter(p => p === '/chat/allowance').length, 2);
  assert.equal(f.paths.includes('/chat/conversation'), false);
});

test('a failed balance lookup stops sending until a successful read-only refresh', async () => {
  let working = false;
  const f = await statusFixture(() => working
    ? Response.json({ allowance: { remainingTextAttempts: 1, includedTextAttempts: 1, purchasedTextAttempts: 0 } })
    : Response.json({ error: 'member_budget_unavailable' }, { status: 503 }));
  assert.equal(f.element('send').disabled, true);
  assert.match(f.element('allowance-status').textContent, /不会扣次数/);
  working = true; await f.element('refresh-allowance').onclick();
  assert.equal(f.element('send').disabled, false);
});

test('a balance reply arriving after sign-out cannot reveal the previous account balance', async () => {
  let finish;
  const f = await statusFixture(() => new Promise(resolve => { finish = resolve; }));
  f.window.FCCareAuth.requireSignIn();
  finish(Response.json({ allowance: { remainingTextAttempts: 87, includedTextAttempts: 87, purchasedTextAttempts: 0 } }));
  await settle();
  assert.doesNotMatch(f.element('allowance').textContent, /87/);
  assert.equal(f.element('send').disabled, true);
});

test('starting cards only prepare a draft, preserve existing writing and never send automatically', async () => {
  const f = await chatFixture(() => { throw Error('must not send'); });
  f.element('message').value = '';
  f.element('choose-talk').onclick();
  assert.match(f.element('message').value, /现在只想先说说/);
  f.element('choose-tired').onclick();
  assert.match(f.element('message').value, /现在只想先说说/);
  assert.equal(f.calls(), 0);
});

test('a voice transcript becomes an editable draft without automatically sending a chat request', async () => {
  const f = await chatFixture(() => { throw Error('must not auto-send'); }, true);
  assert.match(f.element('allowance').textContent, /转文字用 1 次，确认发送再用 1 次/);
  f.window.dispatchEvent({ type: 'fc-care-voice-transcript', detail: 'A fictional editable transcript' });
  assert.equal(f.element('message').value, 'A fictional editable transcript');
  assert.equal(f.calls(), 0);
});

test('malformed successful chat responses preserve the draft and never display a fabricated reply or balance', async () => {
  const valid = {remainingTextAttempts:4,includedTextAttempts:4,purchasedTextAttempts:0};
  for (const payload of [
    {reply:'',allowance:valid}, {reply:{text:'bad'},allowance:valid},
    {reply:'x'.repeat(1201),allowance:valid}, {reply:'Fixture',allowance:{remainingTextAttempts:4}},
    {reply:'Fixture',allowance:{...valid,includedTextAttempts:5}},
    {reply:'Fixture',allowance:{...valid,remainingTextAttempts:-1}},
  ]) {
    const f = await chatFixture(() => Response.json(payload));
    await f.element('chat-form').onsubmit(submit);
    assert.equal(f.calls(),1); assert.equal(f.element('message').value,'A fictional day');
    assert.equal(f.element('messages').children.length,0);
    assert.match(f.element('error').textContent,/可能会使用一次额度/);
  }
});

test('a valid reply is rendered as text even when it contains HTML-like characters', async () => {
  const reply = '<img src=x onerror=alert(1)> & a calm day';
  const f = await chatFixture(() => Response.json({reply,allowance:{remainingTextAttempts:4,includedTextAttempts:4,purchasedTextAttempts:0}}));
  await f.element('chat-form').onsubmit(submit);
  assert.equal(f.element('messages').children[1].textContent,reply);
  assert.equal(f.element('message').value,'');
  assert.equal(f.calls(),1);
});

test('a low balance shows a bilingual gentle warning without charging or requiring a pack', async () => {
  const f=await statusFixture(()=>Response.json({allowance:{remainingTextAttempts:3,includedTextAttempts:3,purchasedTextAttempts:0}}));
  assert.equal(f.element('allowance-tip').hidden,false);
  assert.match(f.element('allowance-tip').textContent,/还可发送 3 次/);
  assert.equal(f.element('extra-panel').hidden,true);
  assert.equal(f.element('send').disabled,false);
  f.element('language').onclick();
  assert.match(f.element('allowance-tip').textContent,/3 sends remain/);
  assert.equal(f.paths.includes('/chat/conversation'),false);
});

test('an ineligible verified email gets clear bilingual feedback without a sign-in loop or a paid call',async()=>{
 const f=await statusFixture(()=>Response.json({error:'member_not_eligible'},{status:403}));
 assert.equal(f.element('send').disabled,true);assert.match(f.element('allowance-status').textContent,/不必重复登录/);
 assert.equal(f.paths.includes('/chat/conversation'),false);
 f.element('language').onclick();assert.match(f.element('allowance-status').textContent,/do not need to sign in again/);
});
