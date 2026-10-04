import test from 'node:test';
import assert from 'node:assert/strict';
import mock from '../services/payments/mockService.js';

test('mock provider creates a deterministic provider order id', async () => {
  const result = await mock.createPayment({ referenceId: 'abc123' });
  assert.equal(result.providerOrderId, 'MOCK-ORDER-abc123');
  assert.equal(result.checkoutUrl, null);
});

test('mock provider capture returns a completed transaction', async () => {
  const result = await mock.capturePayment('MOCK-ORDER-abc123');
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.amountMinor, null);
  assert.equal(result.currency, null);
  assert.match(result.transactionId, /^MOCK-PAY-/);
});

test('mock provider refund returns a refund id', async () => {
  const result = await mock.refundPayment('MOCK-PAY-1', 2500);
  assert.equal(result.amountMinor, 2500);
  assert.match(result.id, /^MOCK-REFUND-MOCK-PAY-1-/);
});
