const crypto = require('node:crypto');
const { createMemberMonthlyBudget } = require('./member-monthly-budget');

function createSupabaseChatStore({ url, publicKey, serverKey, eligibleEmailHashes = null, requirePaidMembership = false, fetcher = fetch } = {}) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) ||
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error();
    origin = parsed.origin;
  } catch { return { ready: false }; }
  if (!publicKey || !serverKey) return { ready: false };
  const eligible = eligibleEmailHashes === null ? null : new Set(eligibleEmailHashes);
  const request = async (path, headers, body) => {
    const response = await fetcher(origin + path, {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    return response;
  };
  const serverHeaders = { apikey: serverKey,
    ...(!serverKey.startsWith('sb_secret_') ? { Authorization: `Bearer ${serverKey}` } : {}) };
  const emailHash = email => crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  async function paidMembership(email) {
    if (typeof email !== 'string' || !email.trim()) return false;
    const response = await request('/rest/v1/rpc/fc_chat_paid_membership', serverHeaders,
      { p_email_hash: emailHash(email) });
    if (!response.ok) throw Error('member_verification_unavailable');
    const result = await response.json();
    // Malformed/unavailable lookups must never fall back to email ownership.
    if (typeof result?.eligible !== 'boolean') throw Error('member_verification_unavailable');
    return result.eligible;
  }
  return {
    ready: true,
    ...(requirePaidMembership ? { canRequestCode: paidMembership } : {}),
    async verifyMember(req) {
      const authorization = req.headers?.authorization;
      if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(authorization)) return null;
      const response = await request('/auth/v1/user', { apikey: publicKey, Authorization: authorization });
      if ([401, 403].includes(response.status)) return null;
      if (!response.ok) throw Error('member_verification_unavailable');
      const user = await response.json();
      if (typeof user.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(user.id) ||
          !user.email_confirmed_at || user.is_anonymous === true) return null;
      if (eligible) {
        const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
        const hash = crypto.createHash('sha256').update(email).digest('hex');
        if (!email || !eligible.has(hash)) throw Error('member_not_eligible');
      }
      if (requirePaidMembership && !await paidMembership(user.email)) throw Error('member_not_eligible');
      return { subject: user.id };
    },
    store: {
      durable: true,
      async status({ member, month }) {
        const response = await request('/rest/v1/rpc/fc_chat_allowance', {
          apikey: serverKey, ...(!serverKey.startsWith('sb_secret_') ? { Authorization: `Bearer ${serverKey}` } : {}),
        }, { p_member: member, p_month: month });
        if (!response.ok) throw Error('member_budget_unavailable');
        return response.json();
      },
      async reserve({ member, month, amountSen, limitSen, requestId }) {
        const response = await request('/rest/v1/rpc/fc_reserve_chat', {
          apikey: serverKey, ...(!serverKey.startsWith('sb_secret_') ? { Authorization: `Bearer ${serverKey}` } : {}),
        }, { p_member: member, p_month: month, p_amount_sen: amountSen,
          p_limit_sen: limitSen, p_request_id: requestId });
        if (!response.ok) throw Error('member_budget_unavailable');
        return response.json();
      },
    },
  };
}

function createConfiguredMemberBudget(env = process.env) {
  if (env.FC_CARE_CHAT_ENABLED !== 'true') return createMemberMonthlyBudget();
  const mode = env.FC_CARE_CHAT_ACCESS_MODE || 'pilot';
  if (!['pilot', 'paid'].includes(mode)) return createMemberMonthlyBudget();
  // Email ownership is not FC membership. Keep the pilot closed unless a
  // trusted operator has explicitly configured the invited account roster.
  const hashes = String(env.FC_CARE_CHAT_PILOT_EMAIL_HASHES || '').split(',').map(v => v.trim());
  if (mode === 'pilot' && (!hashes.length || hashes.length > 1000 || hashes.some(v => !/^[a-f0-9]{64}$/.test(v)))) return createMemberMonthlyBudget();
  const connection = createSupabaseChatStore({ url: env.FC_SUPABASE_URL,
    publicKey: env.FC_SUPABASE_PUBLISHABLE_KEY, serverKey: env.FC_SUPABASE_SERVER_KEY,
    eligibleEmailHashes: mode === 'pilot' ? hashes : null, requirePaidMembership: mode === 'paid' });
  if (!connection.ready) return createMemberMonthlyBudget();
  const budget = createMemberMonthlyBudget({ verifyMember: connection.verifyMember,
    store: connection.store, hashSecret: env.FC_CARE_CHAT_MEMBER_HASH_SECRET });
  if (mode === 'paid') return { ...budget, canRequestCode: connection.canRequestCode };
  const invited = new Set(hashes);
  return { ...budget, canRequestCode(email) {
    return invited.has(crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex'));
  } };
}
module.exports = { createSupabaseChatStore, createConfiguredMemberBudget };
