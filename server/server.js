import mongoose from 'mongoose';
import app from './app.js';
import { logger } from './utils/logger.js';

for (const k of ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']) {
  if (!process.env[k]) { logger.error(`Missing required env var ${k}`); process.exit(1); }
}
const paymentMode = String(process.env.PAYMENT_MODE || 'paypal').toLowerCase();
if (!['mock', 'paypal', 'stripe'].includes(paymentMode)) {
  logger.error(`Invalid PAYMENT_MODE: ${paymentMode}. Use mock | paypal | stripe`); process.exit(1);
}
if (paymentMode === 'paypal' && (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)) {
  logger.error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required when PAYMENT_MODE=paypal'); process.exit(1);
}
if (paymentMode === 'stripe' && !process.env.STRIPE_SECRET_KEY) {
  logger.error('STRIPE_SECRET_KEY is required when PAYMENT_MODE=stripe'); process.exit(1);
}

mongoose.set('strictQuery', true);
try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
  if (process.env.SYNC_INDEXES === 'true') {
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
    logger.info('Indexes synced', { models: Object.keys(mongoose.models).length });
  }
} catch (e) {
  logger.error('MongoDB connection failed', { message: e.message }); process.exit(1);
}

const port = process.env.PORT || 5000;
const server = app.listen(port, () => logger.info(`API listening on :${port}`, { mode: paymentMode, env: process.env.NODE_ENV || 'development' }));

// Graceful shutdown: stop accepting connections, finish in-flight requests, then close the DB.
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      try { await mongoose.connection.close(); } catch { /* already closed */ }
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10000).unref();
  });
}
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => { logger.error('Uncaught exception', { message: err.message }); process.exit(1); });
