// Dependency-free in-memory rate limiter (fixed window + periodic sweep).
// Fine for a single instance; swap for Redis behind a multi-instance deploy.
const store = new Map(); // key -> { count, resetAt }
let timer = null;

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}
function startSweep() {
  if (timer) return timer;
  timer = setInterval(sweep, 60_000);
  timer.unref?.();
  return timer;
}

export function rateLimit({ windowMs = 60_000, max = 60, key: keyFn, message } = {}) {
  startSweep();
  return (req, res, next) => {
    const id = keyFn ? keyFn(req) : req.user?.id || req.ip;
    const now = Date.now();
    let entry = store.get(id);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(id, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > max) {
      const retry = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return res.status(429).json({ message: message || `Too many requests. Try again in ${retry}s.` });
    }
    return next();
  };
}
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 300 });
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: 'Too many login attempts. Please try again later.' });
export const orderLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Too many checkout attempts. Please wait a minute.' });
export default rateLimit;
