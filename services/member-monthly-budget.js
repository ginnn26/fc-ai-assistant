const crypto = require('node:crypto');
const LIMIT_SEN = 700; // Owner-approved monthly ceiling; purchased packs remain separate.
const TEXT_RESERVATION_SEN = 5;

function monthAt(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date(now));
  return parts.find(p => p.type === 'year').value + '-' + parts.find(p => p.type === 'month').value;
}
function nextResetAt(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 1, -8)).toISOString();
}
function allowanceFrom(result, month, minimumUsed = 0) {
  const paid = result?.paidRemainingSen ?? 0;
  if (!Number.isInteger(result?.usedSen) || result.usedSen < minimumUsed || result.usedSen > LIMIT_SEN ||
      !Number.isInteger(paid) || paid < 0 || paid > 2147483647) throw Error('member_budget_unavailable');
  return { month, nextResetAt: nextResetAt(month),
    remainingTextAttempts: Math.floor((LIMIT_SEN - result.usedSen + paid) / TEXT_RESERVATION_SEN),
    includedTextAttempts: Math.floor((LIMIT_SEN - result.usedSen) / TEXT_RESERVATION_SEN),
    purchasedTextAttempts: Math.floor(paid / TEXT_RESERVATION_SEN) };
}

// No memory/file fallback: production requires an atomic durable store and a
// server-verified stable subject. Neither browser IDs nor supplied emails qualify.
function createMemberMonthlyBudget({ verifyMember, store, hashSecret, now = Date.now } = {}) {
  const ready = typeof verifyMember === 'function' && store?.durable === true &&
    typeof store.reserve === 'function' && typeof hashSecret === 'string' && hashSecret.length >= 32;
  async function verifiedAccount(req) {
    if (!ready) throw Error('member_budget_not_ready');
    const identity = await verifyMember(req);
    if (!identity || typeof identity.subject !== 'string' || !identity.subject || identity.subject.length > 256)
      throw Error('member_login_required');
    return { member: crypto.createHmac('sha256', hashSecret).update(identity.subject).digest('hex'), month: monthAt(now()) };
  }
  async function reserve(req) {
    const { member, month } = await verifiedAccount(req);
    const result = await store.reserve({ member, month, amountSen: TEXT_RESERVATION_SEN,
      limitSen: LIMIT_SEN, requestId: crypto.randomUUID() });
    if (result?.accepted === false) throw Error('monthly_allowance_reached');
    if (result?.accepted !== true) throw Error('member_budget_unavailable');
    return allowanceFrom(result, month, TEXT_RESERVATION_SEN);
  }
  return {
    ready,
    includedTextAttempts: LIMIT_SEN / TEXT_RESERVATION_SEN,
    ...(typeof store?.status === 'function' ? { async status(req) {
      const { member, month } = await verifiedAccount(req);
      return allowanceFrom(await store.status({ member, month }), month);
    } } : {}),
    // Both operations share the SAME durable wallet. Each reserves one unit
    // before a provider attempt; failed/ambiguous attempts are never retried.
    reserveText: reserve,
    reserveVoice: reserve,
  };
}
module.exports = { createMemberMonthlyBudget, monthAt, nextResetAt, LIMIT_SEN, TEXT_RESERVATION_SEN };
