import crypto from 'node:crypto';
import path from 'node:path';
const mac = (p, secret) => crypto.createHmac('sha256', secret).update(`${p.courseId}|${p.lessonId}|${p.userId}|${p.exp}`).digest('hex');
export const signMedia = (p, secret) => mac(p, secret);
export function verifyMedia(p, sig, secret, nowMs = Date.now()) {
  if (typeof sig !== 'string' || !secret || !Number.isFinite(+p.exp) || +p.exp < nowMs) return false;
  const e = mac(p, secret);
  return sig.length === e.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(e));
}
// Resolve a storage key inside base dir; null if it escapes (path traversal) or is invalid.
export function safePath(base, key) {
  if (typeof key !== 'string' || !key || key.includes('\0')) return null;
  if (path.isAbsolute(key) || /^[a-z]:/i.test(key)) return null; // absolute keys are never allowed, on any OS
  const root = path.resolve(base), full = path.resolve(root, key);
  return full.startsWith(root + path.sep) ? full : null; // also rejects the root itself
}
export const mediaSecret = () => process.env.MEDIA_SECRET || process.env.JWT_SECRET;
