'use strict';

// Count a fixed input; never generate a response or send member content.
// https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens
function createProviderReadiness({ probe, now = Date.now, log = console.info }) {
  let cached, expiresAt = 0, flight;
  function identifier(headers, name, prefix) {
    const value = headers?.get(name);
    return typeof value === 'string' && new RegExp('^' + prefix + '-[A-Za-z0-9_-]{1,100}$').test(value)
      ? value : 'not_reported';
  }
  return async function check() {
    if (cached && now() < expiresAt) return cached;
    if (flight) return flight;
    flight = (async () => {
      let result;
      try {
        const { data, response } = await probe();
        if (!Number.isInteger(data?.input_tokens) || data.input_tokens < 0) throw Error('invalid_probe');
        const organization = identifier(response?.headers, 'openai-organization', 'org');
        const project = identifier(response?.headers, 'openai-project', 'proj');
        // Deliberately log only allowlisted non-secret metadata, never errors,
        // credentials, request/response objects or arbitrary response headers.
        log('FC_PROVIDER_CHECK status=ok organization=' + organization + ' project=' + project);
        result = { available: true, check: 'free_input_token_count', checkedAt: new Date(now()).toISOString() };
      } catch (error) {
        const status = Number.isInteger(error?.status) ? error.status : 0;
        const reason = status === 401 || status === 403 ? 'authentication_or_access'
          : status === 429 ? 'quota_or_rate_limit' : 'temporarily_unavailable';
        log('FC_PROVIDER_CHECK status=unavailable reason=' + reason);
        result = { available: false, check: 'free_input_token_count', reason, checkedAt: new Date(now()).toISOString() };
      }
      cached = result;
      expiresAt = now() + (result.available ? 600000 : 60000);
      return result;
    })();
    try { return await flight; } finally { flight = null; }
  };
}

module.exports = { createProviderReadiness };
