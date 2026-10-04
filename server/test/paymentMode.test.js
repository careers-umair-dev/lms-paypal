import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePaymentProvider } from '../utils/paymentMode.js';

test('the configured real provider is selected when no route provider is supplied', () => {
  assert.equal(resolvePaymentProvider('paypal'), 'paypal');
  assert.equal(resolvePaymentProvider('stripe'), 'stripe');
});

test('real payment modes reject provider routes that could bypass checkout', () => {
  assert.throws(() => resolvePaymentProvider('paypal', 'mock'), { status: 400 });
  assert.throws(() => resolvePaymentProvider('stripe', 'mock'), { status: 400 });
  assert.throws(() => resolvePaymentProvider('paypal', 'stripe'), { status: 400 });
});

test('mock mode always resolves to the mock provider', () => {
  assert.equal(resolvePaymentProvider('mock'), 'mock');
  assert.throws(() => resolvePaymentProvider('mock', 'paypal'), { status: 400 });
});