import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { signMedia, verifyMedia, safePath } from '../utils/signedUrl.js';
const p = { courseId: 'c1', lessonId: 'l1', userId: 'u1', exp: Date.now() + 60000 };
test('valid signature verifies', () => assert.ok(verifyMedia({ ...p, exp: String(p.exp) }, signMedia(p, 's'), 's')));
test('expired link rejected', () => { const q = { ...p, exp: Date.now() - 1 }; assert.equal(verifyMedia(q, signMedia(q, 's'), 's'), false); });
test('tampered course/lesson/user/exp or wrong secret rejected', () => {
  const sig = signMedia(p, 's');
  for (const k of ['courseId', 'lessonId', 'userId']) assert.equal(verifyMedia({ ...p, [k]: 'x' }, sig, 's'), false, k);
  assert.equal(verifyMedia({ ...p, exp: p.exp + 1 }, sig, 's'), false);
  assert.equal(verifyMedia(p, sig, 'other'), false);
  assert.equal(verifyMedia(p, undefined, 's'), false);
  assert.equal(verifyMedia(p, 'abc', 's'), false);
});
test('safePath resolves inside base and blocks traversal / absolute escapes', () => {
  const base = path.resolve('/srv/media'); // absolute so it behaves the same on Windows and POSIX
  const ok = safePath(base, 'a/b.mp4');
  assert.equal(ok, path.resolve(base, 'a', 'b.mp4'));
  for (const k of ['../etc/passwd', 'a/../../x', '/etc/passwd', '', null, 'a\0b'])
    assert.equal(safePath(base, k), null, String(k));
  assert.equal(safePath(base, path.join(base, '..', '..', 'escape.mp4')), null);
});
