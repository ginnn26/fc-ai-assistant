const crypto = require('node:crypto');
const PRODUCT_ID = 'fc-care-chat-extra-v1';
const PRICE_SEN = 1000;
const INTERNAL_ALLOWANCE_SEN = 500;

// Called only from a payment-provider integration, never a browser success page.
// verifyPayment must verify the provider's signature AND retrieve authoritative
// paid status, currency, captured amount, merchant and immutable order reference.
function createCareChatTopups({ verifyPayment, store, merchantId } = {}) {
  const ready = typeof verifyPayment === 'function' && store?.durable === true &&
    typeof store.getOrder === 'function' && typeof store.creditOnce === 'function' &&
    typeof merchantId === 'string' && merchantId.length > 0;
  return {
    ready,
    async fulfill(providerEvent) {
      if (!ready) throw Error('topups_not_ready');
      const payment = await verifyPayment(providerEvent);
      if (!payment || payment.status !== 'paid' || payment.currency !== 'MYR' ||
          payment.amountSen !== PRICE_SEN || payment.merchantId !== merchantId ||
          typeof payment.id !== 'string' || !payment.id || payment.id.length > 256 ||
          typeof payment.orderId !== 'string' || !payment.orderId || payment.orderId.length > 128)
        throw Error('payment_not_eligible');
      // Member ownership and price come from the order created by our server,
      // not from the event metadata or an email supplied by the customer.
      const order = await store.getOrder(payment.orderId);
      if (!order || order.productId !== PRODUCT_ID || order.priceSen !== PRICE_SEN ||
          order.currency !== 'MYR' || order.merchantId !== merchantId ||
          !['pending', 'credited'].includes(order.status) ||
          typeof order.member !== 'string' || !/^[a-f0-9]{64}$/.test(order.member))
        throw Error('order_not_eligible');
      const paymentKey = crypto.createHash('sha256').update(merchantId + '\0' + payment.id).digest('hex');
      // ONE database transaction must enforce UNIQUE(paymentKey), UNIQUE(orderId),
      // verify order state, increase the wallet and mark the order credited.
      const result = await store.creditOnce({ paymentKey, orderId: payment.orderId,
        member: order.member, allowanceSen: INTERNAL_ALLOWANCE_SEN });
      if (result?.credited !== true && result?.alreadyCredited !== true)
        throw Error('payment_credit_unavailable');
      return { credited: result.credited === true, alreadyCredited: result.alreadyCredited === true };
    },
  };
}
module.exports = { createCareChatTopups, PRODUCT_ID, PRICE_SEN, INTERNAL_ALLOWANCE_SEN };
