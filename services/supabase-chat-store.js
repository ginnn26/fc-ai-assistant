const { createMemberMonthlyBudget } = require('./member-monthly-budget');

function createSupabaseChatStore({ url, publicKey, serverKey, fetcher = fetch } = {}) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) ||
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw Error();
    origin = parsed.origin;
  } catch { return { ready: false }; }
  if (!publicKey || !serverKey) return { ready: false };
  const request = async (path, headers, body) => {
    const response = await fetcher(origin + path, {
      method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    return response;
  };
  return {
    ready: true,
    async verifyMember(req) {
      const authorization = req.headers?.authorization;
      if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(authorization)) return null;
      const response = await request('/auth/v1/user', { apikey: publicKey, Authorization: authorization });
      if ([401, 403].includes(response.status)) return null;
      if (!response.ok) throw Error('member_verification_unavailable');
      const user = await response.json();
      if (typeof user.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(user.id) ||
          !user.email_confirmed_at || user.is_anonymous === true) return null;
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
  const connection = createSupabaseChatStore({ url: env.FC_SUPABASE_URL,
    publicKey: env.FC_SUPABASE_PUBLISHABLE_KEY, serverKey: env.FC_SUPABASE_SERVER_KEY });
  if (!connection.ready) return createMemberMonthlyBudget();
  return createMemberMonthlyBudget({ verifyMember: connection.verifyMember,
    store: connection.store, hashSecret: env.FC_CARE_CHAT_MEMBER_HASH_SECRET });
}
module.exports = { createSupabaseChatStore, createConfiguredMemberBudget };
