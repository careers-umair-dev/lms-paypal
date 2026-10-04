import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import { auth, optionalAuth, authorize } from './middleware/auth.js';
import requireCourseAccess from './middleware/requireCourseAccess.js';
import * as A from './controllers/authController.js';
import * as C from './controllers/courseController.js';
import * as O from './controllers/orderController.js';
import { stats } from './controllers/adminController.js';
import * as K from './controllers/couponController.js';
import * as M from './controllers/mediaController.js';
import * as E from './controllers/engagementController.js';
import * as U from './controllers/userController.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { apiLimiter, authLimiter, orderLimiter } from './utils/rateLimit.js';
import { logger } from './utils/logger.js';

const app = express();
app.set('trust proxy', 1); // correct client IPs behind a reverse proxy / load balancer
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean), // browsers send Origin without a trailing slash
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => { req.rawBody = buf; } })); // raw body needed for Stripe signature
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/api', apiLimiter);
const api = express.Router();
const staffOnly = authorize('Admin', 'Instructor');

api.get('/health', (_req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()), ts: new Date().toISOString() }));
api.get('/health/ready', (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db: db ? 'up' : 'down' });
});

api.post('/auth/register', authLimiter, A.register);
api.post('/auth/login', authLimiter, A.login);
api.get('/auth/me', auth, A.me);
api.post('/auth/logout', auth, A.logout);
api.post('/auth/change-password', authLimiter, A.changePassword);
api.put('/auth/profile', auth, U.updateProfile);

api.get('/courses', optionalAuth, C.list);
api.get('/courses/categories', C.categories);
api.get('/courses/:id', optionalAuth, C.get);
api.post('/courses', auth, staffOnly, C.create);
api.put('/courses/:id', auth, staffOnly, C.update);
api.delete('/courses/:id', auth, authorize('Admin'), C.remove);
api.get('/courses/:courseId/lessons/:lessonId', optionalAuth, requireCourseAccess, C.lesson);
api.get('/media/:courseId/:lessonId', M.serve);

// reviews & lesson progress
api.get('/courses/:id/reviews', E.listReviews);
api.post('/courses/:id/reviews', auth, E.upsertReview);
api.delete('/reviews/:reviewId', auth, E.deleteReview);
api.post('/courses/:courseId/lessons/:lessonId/complete', auth, E.markLessonComplete);
api.get('/courses/:courseId/progress', auth, E.myProgress);

api.get('/orders', auth, O.listOrders);
api.get('/orders/:id', auth, O.getOrder);
api.get('/orders/:id/invoice', auth, O.invoice);
api.get('/admin/stats', auth, authorize('Admin'), stats);
api.post('/coupons/preview', auth, K.preview);
api.get('/coupons', auth, authorize('Admin'), K.list);
api.post('/coupons', auth, authorize('Admin'), K.create);
api.patch('/coupons/:id', auth, authorize('Admin'), K.setActive);
api.get('/notifications', auth, K.notifications);
api.post('/notifications/read', auth, K.markRead);
api.get('/enrollments', auth, O.myEnrollments);
api.get('/enrollments/:courseId', auth, O.myEnrollment);
api.use(orderLimiter, paymentRoutes(auth, authorize));

app.use('/api', api);
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => { // never leak internals or provider details
  const status = err.status || (err.name === 'ValidationError' ? 400 : err.name === 'CastError' ? 400 : 500);
  if (status >= 500) logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  else logger.warn(err.message, { path: req.originalUrl });
  const body = { message: status === 500 ? 'Server error' : err.message };
  if (err.name === 'ValidationError' && err.errors) body.fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  res.status(status).json(body);
});
export default app;
