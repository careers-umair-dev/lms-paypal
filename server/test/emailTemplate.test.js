import test from 'node:test';
import assert from 'node:assert/strict';
import { template } from '../utils/emailTemplate.js';
test('user-controlled text is HTML-escaped', () => {
  const h = template('Hi', ['<script>alert("x")</script>']);
  assert.ok(!h.includes('<script>')); assert.ok(h.includes('&lt;script&gt;'));
});
