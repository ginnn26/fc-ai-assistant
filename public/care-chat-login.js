(() => {
  'use strict';
  const key = 'fc-care-chat-session-v1';
  let session = null, remember = false, enabled = false, language = 'zh', epoch = 0, authBusy = false, resendAt = 0;
  let refreshInFlight = null;
  const $ = id => document.getElementById(id);
  const t = (zh, en) => language === 'zh' ? zh : en;
  try { session = JSON.parse(localStorage.getItem(key) || 'null'); remember = !!session; } catch {}
  function valid(value) {
    return typeof value?.accessToken === 'string' && /^[A-Za-z0-9_.-]{30,8192}$/.test(value.accessToken) &&
      typeof value.refreshToken === 'string' && value.refreshToken.length >= 8 && value.refreshToken.length <= 1024 && Number.isFinite(value.expiresAt);
  }
  if (!valid(session)) session = null;
  function clearSession() {
    epoch++;
    refreshInFlight = null;
    session = null;
    remember = false;
    $('login-email').value = ''; $('login-code').value = '';
    $('remember-login').checked = false; $('login-status').textContent = '';
    try { localStorage.removeItem(key); } catch {}
    window.dispatchEvent(new Event('fc-care-auth-changed'));
    paint();
  }
  function persist(value, notify = true) {
    if (!valid(value)) throw Error('invalid_login');
    session = value;
    try { if (remember) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); } catch {}
    if (notify) window.dispatchEvent(new Event('fc-care-auth-changed'));
    paint();
  }
  async function post(path, body) {
    const response = await fetch('/chat/auth/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    return data;
  }
  function refreshSession() {
    const before = epoch;
    if (refreshInFlight?.epoch === before) return refreshInFlight.promise;
    const flight = { epoch: before };
    flight.promise = (async () => {
      try {
        const value = await post('refresh', { refreshToken: session.refreshToken });
        if (before !== epoch) throw Error('member_login_required');
        persist(value, false);
      } catch (error) {
        // A slow result for the previous session must never clear a newer login.
        if (before !== epoch) throw Error('member_login_required');
        if (error.message === 'member_login_required' || error.message === 'invalid_login') {
          clearSession(); throw Error('member_login_required');
        }
        // A temporary outage does not mean the customer has signed out.
        throw Error('auth_temporarily_unavailable');
      } finally { if (refreshInFlight === flight) refreshInFlight = null; }
    })();
    refreshInFlight = flight;
    return flight.promise;
  }
  function paint() {
    $('login-panel').hidden = !enabled || !!session;
    $('sign-out').hidden = !session || !enabled;
    $('login-title').textContent = t('先确认是你，再开始聊聊。', 'A quick sign-in, then a little space to talk.');
    $('login-copy').textContent = t('使用你在 FC 的同一个邮箱收验证码。无需另设密码。邮箱验证由 Supabase 处理，用来保存你的个人额度。', 'Use the same email as FC to receive a code. No extra password. Supabase processes verification so your allowance follows your account.');
    $('email-label').textContent = t('你的 FC 邮箱', 'Your FC email');
    $('code-label').textContent = t('邮箱验证码', 'Email code');
    $('send-code').textContent = t('发送验证码', 'Send code');
    $('verify-code').textContent = t('验证并继续', 'Verify & continue');
    $('remember-label').textContent = t('在这台私人设备保持登录', 'Keep me signed in on this private device');
    $('sign-out').textContent = t('退出聊天账户', 'Sign out of chat');
    const seconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
    if (seconds) $('send-code').textContent = t(`${seconds} 秒后可重发`, `Resend in ${seconds}s`);
    $('send-code').disabled = !enabled || authBusy || seconds > 0;
    $('verify-code').disabled = !enabled || authBusy;
    $('login-email').disabled = authBusy;
    $('login-code').disabled = authBusy;
  }
  $('send-code').onclick = async () => {
    if (!enabled || authBusy || Date.now() < resendAt) return;
    if (!$('login-email').reportValidity()) return;
    const before = epoch;
    authBusy = true; paint();
    try {
      await post('request-code', { email: $('login-email').value.trim() });
      if (before !== epoch) return;
      resendAt = Date.now() + 60000;
      $('login-status').textContent = t('请查看邮箱里的验证码邮件；若没看到，也看看垃圾邮件。', 'Check your inbox for the code. Check spam too if needed.');
      $('login-code').focus();
    } catch (error) {
      if (before !== epoch) return;
      if (error.message === 'auth_please_wait' || error.message === 'please_wait') resendAt = Date.now() + 60000;
      $('login-status').textContent = t('暂时无法发送。请稍后再试，不必连续点击重发。', 'Unable to send right now. Please try later rather than repeatedly resending.');
    } finally { authBusy = false; paint(); }
  };
  $('login-form').onsubmit = async event => {
    event.preventDefault();
    if (!enabled || authBusy) return;
    const before = epoch;
    authBusy = true; paint();
    try {
      remember = $('remember-login').checked;
      const value = await post('verify-code', { email: $('login-email').value.trim(), code: $('login-code').value.trim() });
      if (before !== epoch) return;
      persist(value); $('login-code').value = ''; $('login-status').textContent = '';
    } catch (error) {
      if (before !== epoch) return;
      $('login-status').textContent = error.message === 'invalid_or_expired_code'
        ? t('验证码不正确或已过期。请使用最新邮件中的验证码。', 'That code is incorrect or has expired. Use the code from your latest email.')
        : t('暂时无法完成验证，请稍后再试。', 'Unable to complete verification right now. Please try later.');
    } finally { authBusy = false; paint(); }
  };
  $('sign-out').onclick = () => {
    const token = session?.accessToken;
    clearSession();
    if (token) fetch('/chat/auth/logout', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: '{}', signal: AbortSignal.timeout(10000) }).catch(() => {});
  };
  window.FCCareAuth = {
    configure(config) { enabled = config.emailLogin === true; paint(); },
    language(value) { language = value; paint(); },
    signedIn: () => !!session,
    requireSignIn: clearSession,
    async headers() {
      if (!session) throw Error('member_login_required');
      if (session.expiresAt < Date.now() / 1000 + 60) {
        await refreshSession();
      }
      if (!session) throw Error('member_login_required');
      return { Authorization: 'Bearer ' + session.accessToken };
    },
  };
  window.addEventListener('storage', event => {
    if ((event.key !== key && event.key !== null) || !remember || !session) return;
    let latest = null;
    try { latest = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    if (!valid(latest)) { clearSession(); return; }
    if (latest.accessToken === session.accessToken && latest.refreshToken === session.refreshToken) return;
    // Only explicitly remembered tabs adopt a changed saved session. Clear the
    // old conversation/allowance before any new account can be displayed.
    epoch++; refreshInFlight = null; session = latest;
    window.dispatchEvent(new Event('fc-care-auth-changed')); paint();
  });
  // This is a convenience cooldown, not a security limit. The provider and
  // server must still enforce rate limits independently of this page.
  setInterval(() => { if (resendAt) { if (Date.now() >= resendAt) resendAt = 0; paint(); } }, 1000);
  paint();
})();
