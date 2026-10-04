const BASE = () => process.env.PAYPAL_ENVIRONMENT === 'live'
  ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const money = (m) => (m / 100).toFixed(2);
async function token() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials' });
  if (!r.ok) throw new Error('PayPal auth failed');
  return (await r.json()).access_token;
}
async function call(path, method, body, extra = {}) {
  const r = await fetch(`${BASE()}${path}`, { method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...extra },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
export default {
  async createPayment({ amountMinor, currency, referenceId }) {
    const { ok, data } = await call('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: referenceId, custom_id: referenceId,
        amount: { currency_code: currency, value: money(amountMinor) } }] },
      { 'PayPal-Request-Id': referenceId });
    if (!ok) throw new Error('PayPal create failed');
    return { providerOrderId: data.id };
  },
  async getPayment(id) { return (await call(`/v2/checkout/orders/${id}`, 'GET')).data; },
  async capturePayment(id) {
    const res = await call(`/v2/checkout/orders/${id}/capture`, 'POST', {}, { 'PayPal-Request-Id': `cap-${id}` });
    let data = res.data;
    if (!res.ok) { // already captured / retry: read current state instead
      data = await this.getPayment(id);
      if (!data?.purchase_units) throw new Error('PayPal capture failed');
    }
    const cap = data.purchase_units?.[0]?.payments?.captures?.[0];
    return { status: cap?.status || data.status,
      amountMinor: cap ? Math.round(parseFloat(cap.amount.value) * 100) : null,
      currency: cap?.amount.currency_code, transactionId: cap?.id };
  },
  async verifyWebhook(headers, event) {
    const { ok, data } = await call('/v1/notifications/verify-webhook-signature', 'POST', {
      auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event });
    return ok && data.verification_status === 'SUCCESS';
  },
  async refundPayment(transactionId, amountMinor, currency) {
    const body = amountMinor ? { amount: { value: money(amountMinor), currency_code: currency } } : {};
    const { ok, data } = await call(`/v2/payments/captures/${transactionId}/refund`, 'POST', body);
    if (!ok) throw new Error('PayPal refund failed');
    return data;
  },
};
