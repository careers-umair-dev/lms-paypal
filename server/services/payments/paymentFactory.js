import paypal from './paypalService.js';
import stripe from './stripeService.js';
import mock from './mockService.js';

const providers = {
  paypal,
  mock,
  ...(process.env.STRIPE_SECRET_KEY ? { stripe } : {}),
};

export const getProvider = (name) => {
  if (!providers[name]) throw Object.assign(new Error('Unsupported provider'), { status: 400 });
  return providers[name];
};
