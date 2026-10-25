function createEmailAuth({ url, publicKey, enabled = false, fetcher = fetch, now = Date.now } = {}) {
  let origin;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(u.hostname) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error();
    origin = u.origin;
  } catch { return { ready: false }; }
  if (!enabled || typeof publicKey !== 'string' || !publicKey) return { ready: false };
  async function request(path, body, extraHeaders = {}) {
    const response = await fetcher(origin + '/auth/v1/' + path, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { apikey: publicKey, 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body),
    });
    if (!response.ok) {
      if (response.status === 429) throw Error('auth_please_wait');
      // A rejected/expired code is different from a broken sending service.
      // Only expose our own code, never the provider response or account data.
      if (path === 'verify' && [400, 401, 403, 422].includes(response.status)) throw Error('invalid_or_expired_code');
      if (path === 'token?grant_type=refresh_token' && [400, 401, 403, 422].includes(response.status)) throw Error('member_login_required');
      throw Error('email_auth_unavailable');
    }
    return response.status === 204 ? {} : response.json();
  }
  function normalizeSession(data) {
    if (typeof data.access_token !== 'string' || !/^[A-Za-z0-9_.-]{30,8192}$/.test(data.access_token) ||
        typeof data.refresh_token !== 'string' || data.refresh_token.length < 8 || data.refresh_token.length > 1024 ||
        typeof data.user?.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.user.id) ||
        !data.user.email_confirmed_at || data.user.is_anonymous === true ||
        !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 86400)
      throw Error('email_auth_unavailable');
    return { accessToken: data.access_token, refreshToken: data.refresh_token,
      expiresAt: Math.floor(now() / 1000) + data.expires_in };
  }
  return {
    ready: true,
    async requestCode(email) { await request('otp', { email, create_user: true }); },
    async verifyCode(email, code) { return normalizeSession(await request('verify', { email, token: code, type: 'email' })); },
    async refresh(refreshToken) { return normalizeSession(await request('token?grant_type=refresh_token', { refresh_token: refreshToken })); },
    async signOut(accessToken) { await request('logout?scope=local', {}, { Authorization: 'Bearer ' + accessToken }); },
  };
}
module.exports = { createEmailAuth };
