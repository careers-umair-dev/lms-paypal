import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyStripeSignature as v } from '../utils/stripeSignature.js';
const body = Buffer.from('{"id":"evt_1"}'), now = 1_700_000_000;
const sig = (t, b = body, s = 'whsec') => `t=${t},v1=${crypto.createHmac('sha256', s).update(`${t}.`).update(b).digest('hex')}`;
test('valid signature accepted', () => assert.ok(v(body, sig(now), 'whsec', now)));
test('wrong secret, tampered body rejected', () => {
  assert.equal(v(body, sig(now), 'other', now), false);
  assert.equal(v(Buffer.from('{"id":"evt_2"}'), sig(now), 'whsec', now), false);
});
test('stale or invalid timestamp rejected', () => {
  assert.equal(v(body, sig(now - 1000), 'whsec', now), false);
  assert.equal(v(body, sig('abc'), 'whsec', now), false);
});
test('missing pieces rejected; any matching v1 accepted', () => {
  assert.equal(v(body, '', 'whsec', now), false); assert.equal(v(null, sig(now), 'whsec', now), false);
  assert.ok(v(body, `${sig(now)},v1=deadbeef`, 'whsec', now));
});
