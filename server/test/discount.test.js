import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCoupon } from '../utils/discount.js';
test('percent discount floors in integer cents', () => {
  assert.deepEqual(applyCoupon({ type: 'percent', value: 33 }, 999, 'USD'), { amountMinor: 670, discountMinor: 329 });
});
test('fixed discount applies in matching currency', () => {
  assert.deepEqual(applyCoupon({ type: 'fixed', value: 500, currency: 'USD' }, 2000, 'USD'), { amountMinor: 1500, discountMinor: 500 });
});
test('fixed coupon rejected for other currency', () => {
  assert.throws(() => applyCoupon({ type: 'fixed', value: 500, currency: 'EUR' }, 2000, 'USD'), /currency/);
});
test('discount never exceeds price and free checkout is rejected', () => {
  assert.throws(() => applyCoupon({ type: 'fixed', value: 5000, currency: 'USD' }, 2000, 'USD'), /too large/);
  assert.throws(() => applyCoupon({ type: 'percent', value: 99 }, 100, 'USD'), /too large/);
});
test('result is always an integer', () => {
  for (const p of [1, 7, 33, 50, 99]) for (const l of [5000, 9999, 19999, 123456]) {
    const r = applyCoupon({ type: 'percent', value: p }, l, 'USD');
    assert.ok(Number.isInteger(r.amountMinor) && Number.isInteger(r.discountMinor) && r.amountMinor + r.discountMinor === l);
  }
});
