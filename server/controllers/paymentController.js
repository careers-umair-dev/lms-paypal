import Course from '../models/Course.js';
import Order from '../models/Order.js';
import Enrollment from '../models/Enrollment.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { getProvider } from '../services/payments/paymentFactory.js';
import { grantAccess } from '../services/enrollmentService.js';
import { priceFor } from '../services/pricingService.js';
import { onPaid, onFailed } from '../services/postPayment.js';
import { settleRefund } from '../services/refundService.js';
import { parseRefundAmount } from '../utils/refund.js';
import { verifyStripeSignature } from '../utils/stripeSignature.js';
import { resolvePaymentProvider } from '../utils/paymentMode.js';
import { isCourseVisible } from '../utils/courseVisibility.js';

async function claimEvent(eventId, type) {
  try { await WebhookEvent.create({ eventId, type }); return true; }
  catch (e) { if (e.code !== 11000) throw e; return !(await WebhookEvent.findOne({ eventId }))?.processedAt; }
}

const paymentMode = () => String(process.env.PAYMENT_MODE || 'paypal').toLowerCase();

export async function createOrder(req, res, next) {
  try {
    const provider = resolvePaymentProvider(paymentMode(), req.body.provider);
    const { courseId, couponCode } = req.body;
    const course = await Course.findById(courseId);
    if (!course || !course.isPremium) return res.status(404).json({ message: 'Premium course not found' });
    const enrolled = await Enrollment.exists({ user: req.user.id, course: course._id, status: 'ACTIVE' });
    if (!isCourseVisible(course, req.user, !!enrolled)) return res.status(404).json({ message: 'Premium course not found' });
    if (enrolled)
      return res.status(409).json({ message: 'Already purchased' });

    const price = await priceFor(course, couponCode, req.user.id);
    let order = await Order.findOne({
      user: req.user.id, course: course._id, provider, status: 'CREATED',
      amountMinor: price.amountMinor, currency: course.currency, couponCode: price.code
    });

    if (!order) {
      order = await Order.create({
        user: req.user.id, course: course._id, provider,
        amountMinor: price.amountMinor, currency: course.currency,
        couponCode: price.code, discountMinor: price.discountMinor
      });
      try {
        const result = await getProvider(provider).createPayment({
          amountMinor: order.amountMinor, currency: order.currency,
          referenceId: String(order._id), title: course.title, courseId: String(course._id)
        });
        order = await Order.transition(order._id, 'CREATED', {
          providerOrderId: result.providerOrderId,
          ...(result.checkoutUrl && { checkoutUrl: result.checkoutUrl })
        });
      } catch (e) {
        await Order.transition(order._id, 'FAILED');
        throw e;
      }
    }

    res.status(201).json({
      orderId: order._id,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      checkoutUrl: order.checkoutUrl,
      paymentMode: paymentMode(),
      amountMinor: order.amountMinor,
      currency: order.currency
    });
  } catch (e) { next(e); }
}

export async function captureOrder(req, res, next) {
  try {
    const order = await Order.findOne({ providerOrderId: req.body.providerOrderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    resolvePaymentProvider(paymentMode(), order.provider);

    if (order.status === 'COMPLETED') {
      await grantAccess(order);
      return res.json({ status: 'COMPLETED', orderId: order._id, transactionId: order.providerTransactionId });
    }

    if (!['CREATED', 'APPROVED'].includes(order.status))
      return res.status(409).json({ message: `Order is ${order.status}` });

    let cap;
    try {
      cap = await getProvider(order.provider).capturePayment(order.providerOrderId);
    } catch {
      return res.status(202).json({
        status: 'UNKNOWN',
        message: 'We could not confirm your payment yet. Please check again shortly.'
      });
    }

    // Mock payments are intentionally simulated, so the backend supplies the
    // expected amount/currency when the mock provider returns null for them.
    const verifiedAmount = cap.amountMinor ?? order.amountMinor;
    const verifiedCurrency = cap.currency ?? order.currency;

    if (cap.status !== 'COMPLETED')
      return res.status(202).json({ status: 'PENDING', message: 'Payment is still being processed.' });

    if (verifiedAmount !== order.amountMinor || verifiedCurrency !== order.currency) {
      const f = await Order.transition(order._id, 'FAILED');
      if (f) await onFailed(f);
      return res.status(409).json({ message: 'Payment verification mismatch. Contact support.' });
    }

    const won = await Order.transition(order._id, 'COMPLETED', {
      providerTransactionId: cap.transactionId,
      completedAt: new Date()
    });
    const done = won || await Order.findById(order._id);
    await grantAccess(done);
    if (won) await onPaid(won);

    res.json({
      status: 'COMPLETED',
      orderId: done._id,
      transactionId: done.providerTransactionId,
      provider: done.provider
    });
  } catch (e) { next(e); }
}

export async function paypalWebhook(req, res, next) {
  try {
    const event = req.body;
    if (!(await getProvider('paypal').verifyWebhook(req.headers, event)))
      return res.status(400).json({ message: 'Invalid signature' });
    if (!(await claimEvent(event.id, event.event_type))) return res.json({ duplicate: true });
    const r = event.resource || {};
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const order = await Order.findById(r.custom_id).catch(() => null);
      if (order && Math.round(parseFloat(r.amount?.value) * 100) === order.amountMinor && r.amount.currency_code === order.currency) {
        const won = await Order.transition(order._id, 'COMPLETED', { providerTransactionId: r.id, completedAt: new Date() });
        const done = won || (order.status === 'COMPLETED' ? order : null);
        if (done) await grantAccess(done);
        if (won) await onPaid(won);
      }
    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const order = await Order.findById(r.custom_id).catch(() => null);
      const f = order && await Order.transition(order._id, 'FAILED');
      if (f) await onFailed(f);
    } else if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(event.event_type)) {
      const capId = (r.links || []).find((l) => l.rel === 'up')?.href?.split('/').pop() || r.id;
      const order = await Order.findOne({ providerTransactionId: capId });
      if (order) {
        const reversed = event.event_type.endsWith('REVERSED');
        const amt = reversed ? order.amountMinor - order.refundedMinor : Math.round(parseFloat(r.amount?.value) * 100);
        const rid = reversed ? `reversal-${event.id}` : r.id;
        if (Number.isInteger(amt) && amt > 0) {
          const { settleRefund } = await import('../services/refundService.js');
          await settleRefund(order, rid, amt);
        }
      }
    }
    await WebhookEvent.updateOne({ eventId: event.id }, { processedAt: new Date() });
    res.json({ received: true });
  } catch (e) { next(e); }
}

export async function refundOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || !['COMPLETED', 'PARTIALLY_REFUNDED'].includes(order.status))
      return res.status(409).json({ message: 'Order not refundable' });
    const remaining = order.amountMinor - order.refundedMinor;
    const amt = parseRefundAmount(req.body?.amount, remaining);
    const data = await getProvider(order.provider).refundPayment(
      order.providerTransactionId, amt === remaining ? null : amt, order.currency);
    await (await import('../services/refundService.js')).settleRefund(order, data.id, amt);
    const fresh = await Order.findById(order._id);
    res.json({ status: fresh.status, refundedMinor: fresh.refundedMinor });
  } catch (e) { next(e); }
}

export async function stripeWebhook(req, res, next) {
  try {
    if (!verifyStripeSignature(req.rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET))
      return res.status(400).json({ message: 'Invalid signature' });
    const event = req.body;
    if (!(await claimEvent(event.id, event.type))) return res.json({ duplicate: true });
    const s = event.data?.object || {};
    const order = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)
      ? await Order.findById(s.client_reference_id).catch(() => null) : null;
    if (order && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && s.payment_status === 'paid') {
      if (s.amount_total === order.amountMinor && String(s.currency).toUpperCase() === order.currency) {
        const won = await Order.transition(order._id, 'COMPLETED', { providerTransactionId: s.payment_intent, completedAt: new Date() });
        const done = won || (order.status === 'COMPLETED' ? order : null);
        if (done) await grantAccess(done);
        if (won) await onPaid(won);
      }
    } else if (order && event.type === 'checkout.session.async_payment_failed') {
      const f = await Order.transition(order._id, 'FAILED');
      if (f) await onFailed(f);
    } else if (order && event.type === 'checkout.session.expired') {
      await Order.transition(order._id, 'CANCELLED');
    }
    await WebhookEvent.updateOne({ eventId: event.id }, { processedAt: new Date() });
    res.json({ received: true });
  } catch (e) { next(e); }
}
