import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, fromStates, TRANSITIONS } from '../utils/stateMachine.js';
test('allowed transitions', () => {
  for (const [f, t] of [['PENDING', 'CREATED'], ['CREATED', 'COMPLETED'], ['APPROVED', 'COMPLETED'], ['COMPLETED', 'REFUNDED'], ['PARTIALLY_REFUNDED', 'REFUNDED']])
    assert.ok(canTransition(f, t), `${f}->${t}`);
});
test('invalid transitions are rejected', () => {
  for (const [f, t] of [['PENDING', 'COMPLETED'], ['FAILED', 'COMPLETED'], ['REFUNDED', 'COMPLETED'], ['COMPLETED', 'FAILED'], ['CANCELLED', 'CREATED'], ['COMPLETED', 'COMPLETED'], ['X', 'COMPLETED']])
    assert.equal(canTransition(f, t), false, `${f}->${t}`);
});
test('terminal states have no exits', () => {
  for (const s of ['FAILED', 'CANCELLED', 'REFUNDED']) assert.deepEqual(TRANSITIONS[s], []);
});
test('COMPLETED can only be entered from CREATED/APPROVED (never from PENDING/FAILED/REFUNDED)', () => {
  assert.deepEqual(fromStates('COMPLETED').sort(), ['APPROVED', 'CREATED']);
});
test('multiple partial refunds allowed, but REFUNDED is final', () => {
  assert.ok(canTransition('PARTIALLY_REFUNDED', 'PARTIALLY_REFUNDED'));
  assert.equal(canTransition('REFUNDED', 'PARTIALLY_REFUNDED'), false);
});
