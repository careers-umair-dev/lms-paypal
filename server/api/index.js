// Vercel serverless entry point.
// Vercel cannot run server.js (it calls app.listen() and process.exit()), so this wrapper reuses the
// exact same Express app from app.js and opens / re-uses the MongoDB connection per function instance.
// All routes are sent here by the rewrite in vercel.json; Express still sees the original /api/... URL.
import mongoose from 'mongoose';
import app from '../app.js';
import { logger } from '../utils/logger.js';

// Same checks as server.js, but reported as an HTTP error instead of exiting the process.
function configProblem() {
  const missing = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'].filter((k) => !process.env[k]);
  if (missing.length) return `Missing required env var(s): ${missing.join(', ')}`;
  const mode = String(process.env.PAYMENT_MODE || 'paypal').toLowerCase();
  if (!['mock', 'paypal', 'stripe'].includes(mode)) return `Invalid PAYMENT_MODE: ${mode}. Use mock | paypal | stripe`;
  if (mode === 'paypal' && (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET))
    return 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required when PAYMENT_MODE=paypal';
  if (mode === 'stripe' && !process.env.STRIPE_SECRET_KEY) return 'STRIPE_SECRET_KEY is required when PAYMENT_MODE=stripe';
  return null;
}

mongoose.set('strictQuery', true);
let pending = null; // shared by concurrent requests during a cold start
function connect() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!pending) {
    pending = mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 }).finally(() => { pending = null; });
  }
  return pending;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const problem = configProblem();
  if (problem) {
    logger.error(problem);
    return sendJson(res, 500, { message: 'Server is not configured' });
  }
  try {
    await connect();
  } catch (e) {
    logger.error('MongoDB connection failed', { message: e.message });
    return sendJson(res, 503, { message: 'Database unavailable' });
  }
  return app(req, res);
}
