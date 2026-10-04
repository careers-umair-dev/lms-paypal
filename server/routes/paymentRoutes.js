import { Router } from 'express';
import { createOrder, captureOrder, paypalWebhook, stripeWebhook, refundOrder } from '../controllers/paymentController.js';

export default (auth, authorize) => {
  const r = Router();
  const as = (p) => (req, _res, n) => { req.body = { ...req.body, provider: p }; n(); };

  r.post('/payments/paypal/create-order', auth, as('paypal'), createOrder);
  r.post('/payments/paypal/capture-order', auth, captureOrder);
  r.post('/payments/mock/create-order', auth, as('mock'), createOrder);
  r.post('/payments/mock/capture-order', auth, captureOrder);

  r.post('/payments/stripe/create-order', auth, as('stripe'), createOrder);
  r.post('/payments/stripe/confirm', auth, captureOrder);

  r.post('/payments/stripe/webhook', stripeWebhook);
  r.post('/payments/paypal/webhook', paypalWebhook);
  r.post('/orders/:id/refund', auth, authorize('Admin'), refundOrder);
  return r;
};
