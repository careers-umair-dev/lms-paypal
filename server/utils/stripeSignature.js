import crypto from 'node:crypto';
// Verifies the Stripe-Signature header against the RAW request body.
export function verifyStripeSignature(raw, header, secret, nowSec = Math.floor(Date.now() / 1000), tolerance = 300) {
  if (!raw || !header || !secret) return false;
  const items = String(header).split(',').map((p) => p.split('='));
  const t = items.find(([k]) => k === 't')?.[1];
  const sigs = items.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !Number.isFinite(Number(t)) || !sigs.length || Math.abs(nowSec - Number(t)) > tolerance) return false;
  const exp = crypto.createHmac('sha256', secret).update(`${t}.`).update(raw).digest('hex');
  return sigs.some((s) => s.length === exp.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(exp)));
}
