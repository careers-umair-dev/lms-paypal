import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRefundAmount } from '../utils/refund.js';
test('blank means full remaining', () => { assert.equal(parseRefundAmount('', 2500), 2500); assert.equal(parseRefundAmount(undefined, 2500), 2500); });
test('decimal major units convert to integer cents', () => { assert.equal(parseRefundAmount('10.05', 2500), 1005); assert.equal(parseRefundAmount(0.1, 2500), 10); });
test('rejects zero, negative, junk and over-refund', () => {
  for (const v of ['0', '-5', 'abc', '25.01', 'NaN']) assert.throws(() => parseRefundAmount(v, 2500), /Invalid refund amount/, v);
});
test('nothing left to refund -> 409', () => {
  assert.throws(() => parseRefundAmount('1', 0), (e) => e.status === 409);
});
