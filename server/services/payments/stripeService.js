// Stripe Checkout (hosted page). Same interface as paypalService; no SDK needed.
const API = 'https://api.stripe.com/v1';
async function call(path, method = 'GET', params, headers = {}) {
  const r = await fetch(`${API}${path}`, { method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(params && { 'Content-Type': 'application/x-www-form-urlencoded' }), ...headers },
    body: params ? new URLSearchParams(params).toString() : undefined, signal: AbortSignal.timeout(15000) });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}
export default {
  async createPayment({ amountMinor, currency, referenceId, title, courseId }) {
    const base = process.env.CLIENT_URL;
    const { ok, data } = await call('/checkout/sessions', 'POST', {
      mode: 'payment', client_reference_id: referenceId, 'metadata[orderId]': referenceId,
      'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(amountMinor),
      'line_items[0][price_data][product_data][name]': title || 'Course',
      success_url: `${base}/courses/${courseId}?stripe_session={CHECKOUT_SESSION_ID}`, cancel_url: `${base}/courses/${courseId}` },
      { 'Idempotency-Key': `order-${referenceId}` });
    if (!ok) throw new Error('Stripe create failed');
    return { providerOrderId: data.id, checkoutUrl: data.url };
  },
  async getPayment(id) { return (await call(`/checkout/sessions/${id}`)).data; },
  async capturePayment(id) { // Stripe has no capture step: confirm the session is actually paid
    const { ok, data } = await call(`/checkout/sessions/${id}`);
    if (!ok) throw new Error('Stripe lookup failed');
    return { status: data.payment_status === 'paid' ? 'COMPLETED' : 'PENDING', amountMinor: data.amount_total,
      currency: String(data.currency).toUpperCase(), transactionId: data.payment_intent };
  },
  async refundPayment(paymentIntent, amountMinor) {
    const { ok, data } = await call('/refunds', 'POST', { payment_intent: paymentIntent, ...(amountMinor && { amount: String(amountMinor) }) });
    if (!ok) throw new Error('Stripe refund failed');
    return data;
  },
};
