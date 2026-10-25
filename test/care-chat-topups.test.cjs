const test = require('node:test');
const assert = require('node:assert/strict');
const { createCareChatTopups, PRODUCT_ID, PRICE_SEN, INTERNAL_ALLOWANCE_SEN } = require('../services/care-chat-topups');

const member = 'a'.repeat(64);
const payment = { id: 'provider-123', orderId: 'order-123', merchantId: 'fc-merchant', status: 'paid', amountSen: 1500, currency: 'MYR' };
const order = { productId: PRODUCT_ID, priceSen: 1500, currency: 'MYR', merchantId: 'fc-merchant', status: 'pending', member };
function fixture(overrides = {}) {
  let credits = 0, balance = 0;
  const seenPayments = new Set(), seenOrders = new Set();
  const store = { durable: true, getOrder: async () => ({ ...order }), creditOnce: async data => {
    // Transactional store double; a real adapter must provide the same guarantees.
    if (seenPayments.has(data.paymentKey) || seenOrders.has(data.orderId))
      return { alreadyCredited: true };
    seenPayments.add(data.paymentKey); seenOrders.add(data.orderId);
    assert.equal(data.member, member);
    credits++; balance += data.allowanceSen;
    return { credited: true };
  } };
  return { service: createCareChatTopups({ merchantId: 'fc-merchant', store,
    verifyPayment: async () => ({ ...payment }), ...overrides }),
    credits: () => credits, balance: () => balance };
}

test('RM15 package has RM5 internal allowance; no gateway or durable store means no sale', async () => {
  assert.equal(PRICE_SEN, 1500); assert.equal(INTERNAL_ALLOWANCE_SEN, 500);
  const service = createCareChatTopups(); assert.equal(service.ready, false);
  await assert.rejects(service.fulfill({ paid: true }), /topups_not_ready/);
});

test('concurrent duplicate payment events credit the member once', async () => {
  const f = fixture();
  const responses = await Promise.all(Array.from({ length: 12 }, () => f.service.fulfill({})));
  assert.equal(responses.filter(r => r.credited).length, 1);
  assert.equal(responses.filter(r => r.alreadyCredited).length, 11);
  assert.equal(f.credits(), 1); assert.equal(f.balance(), 500);
});

test('client success flags and member metadata cannot override provider verification', async () => {
  const f = fixture({ verifyPayment: async () => null });
  await assert.rejects(f.service.fulfill({ paid: true, member: 'b'.repeat(64), amountSen: 1500 }), /payment_not_eligible/);
  assert.equal(f.credits(), 0);
});

test('pending, failed, refunded, underpaid, foreign-currency and wrong-merchant payments earn nothing', async () => {
  for (const changed of [{ status: 'pending' }, { status: 'failed' }, { status: 'refunded' },
    { amountSen: 1000 }, { amountSen: 1499 }, { amountSen: 2000 }, { currency: 'USD' }, { merchantId: 'other' }]) {
    const f = fixture({ verifyPayment: async () => ({ ...payment, ...changed }) });
    await assert.rejects(f.service.fulfill({}), /payment_not_eligible/);
    assert.equal(f.credits(), 0);
  }
});

test('wrong or cancelled order and storage failure cannot report a credited package', async () => {
  for (const value of [null, { ...order, productId: 'other' }, { ...order, status: 'cancelled' },
    { ...order, priceSen: 500 }, { ...order, member: 'browser-email' }]) {
    const f = fixture({ store: { durable: true, getOrder: async () => value, creditOnce: async () => { throw Error('must not credit'); } } });
    await assert.rejects(f.service.fulfill({}), /order_not_eligible/);
  }
  const f = fixture({ store: { durable: true, getOrder: async () => order, creditOnce: async () => undefined } });
  await assert.rejects(f.service.fulfill({}), /payment_credit_unavailable/);
});
