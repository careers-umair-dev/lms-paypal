// Seeds an admin account, a few courses and a welcome coupon. Safe to re-run.
// Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running npm run seed.
import mongoose from 'mongoose';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import LessonProgress from '../models/LessonProgress.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { logger } from '../utils/logger.js';
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (Boolean(email) !== Boolean(password) || (password && password.length < 12)) {
  console.error('To seed an admin, set both ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters.');
  process.exit(1);
}
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

const lessons = (titles) => titles.map((title) => ({ title }));
const cover = (photo) => `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=82`;

const admin = email ? await User.findOneAndUpdate(
  { email },
  { $setOnInsert: { name: 'LMS Admin', password, role: 'Admin' } },
  { new: true, upsert: true },
) : null;

const courses = [
  { title: 'React Masterclass', description: 'Build accessible, production-ready interfaces with component architecture, state, routing, forms, testing, and performance.', category: 'Development', level: 'Intermediate', isPremium: true, priceMinor: 4900, currency: 'USD', published: true, thumbnail: cover('photo-1519389950473-47ba0277781c'), lessons: lessons(['Component architecture that scales', 'State, events, and derived UI', 'Reusable forms and validation', 'Routing and protected experiences', 'Testing accessible interactions', 'Performance and production release']) },
  { title: 'Node.js & Express APIs', description: 'Design reliable REST APIs with validation, authentication, MongoDB, payment workflows, webhooks, and observability.', category: 'Development', level: 'Advanced', isPremium: true, priceMinor: 7900, currency: 'USD', published: true, thumbnail: cover('photo-1555066931-4365d14bab8c'), lessons: lessons(['API boundaries and project structure', 'Express middleware and validation', 'MongoDB models and indexes', 'Authentication and authorization', 'Payments, webhooks, and idempotency', 'Testing, logging, and deployment']) },
  { title: 'JavaScript Fundamentals', description: 'A practical starting point for the language: values, functions, collections, asynchronous work, and browser APIs.', category: 'Development', level: 'Beginner', isPremium: false, priceMinor: 0, currency: 'USD', published: true, thumbnail: cover('photo-1515879218367-8466d910aaa4'), lessons: lessons(['Values, variables, and expressions', 'Conditions and loops', 'Functions and scope', 'Arrays, objects, and data transforms', 'Promises and async workflows', 'DOM events and a small project']) },
  { title: 'Data Structures', description: 'Understand the trade-offs behind common data structures and choose efficient approaches for real problems.', category: 'Computer Science', level: 'Intermediate', isPremium: true, priceMinor: 3900, currency: 'USD', published: true, thumbnail: cover('photo-1509228468518-180dd4864904'), lessons: lessons(['Big O and problem constraints', 'Arrays, stacks, and queues', 'Hash maps and sets', 'Trees and traversal strategies', 'Graphs and shortest paths', 'Choosing structures in practice']) },
  { title: 'UI/UX Design Basics', description: 'Turn user needs into clear flows, thoughtful layouts, accessible interfaces, and testable prototypes.', category: 'Design', level: 'Beginner', isPremium: false, priceMinor: 0, currency: 'USD', published: true, thumbnail: cover('photo-1558655146-9f40138edfeb'), lessons: lessons(['Research and user goals', 'Information architecture and flows', 'Hierarchy, spacing, and typography', 'Accessible color and interaction states', 'Wireframes and interactive prototypes', 'Usability testing and iteration']) },
  { title: 'TypeScript for Modern Apps', description: 'Add confidence to JavaScript projects with practical types, generics, API contracts, React patterns, and testing.', category: 'Development', level: 'Intermediate', isPremium: true, priceMinor: 5900, currency: 'USD', published: true, thumbnail: cover('photo-1517694712202-14dd9538aa97'), lessons: lessons(['Types, inference, and narrowing', 'Object shapes and discriminated unions', 'Generics for reusable utilities', 'Typed API responses and errors', 'React component and form patterns', 'Refactoring and type-aware tests']) },
  { title: 'SQL & Data Modeling', description: 'Model clean relational data and write dependable queries with joins, constraints, indexes, and transactions.', category: 'Data', level: 'Intermediate', isPremium: true, priceMinor: 4500, currency: 'USD', published: true, thumbnail: cover('photo-1551288049-bebda4e38f71'), lessons: lessons(['Tables, keys, and relationships', 'Filtering, grouping, and joins', 'Constraints and data integrity', 'Transactions and concurrency', 'Indexes and query plans', 'Modeling a product database']) },
  { title: 'Cloud DevOps Essentials', description: 'Ship applications with repeatable builds, containers, CI/CD, environment configuration, monitoring, and rollback plans.', category: 'Cloud & DevOps', level: 'Beginner', isPremium: true, priceMinor: 6900, currency: 'USD', published: true, thumbnail: cover('photo-1498050108023-c5249f4df085'), lessons: lessons(['Source control and release flow', 'Builds and continuous integration', 'Container images and configuration', 'Deployment environments and secrets', 'Health checks and observability', 'Safe releases and rollback']) },
];
for (const c of courses) await Course.findOneAndUpdate({ title: c.title }, { $set: c }, { upsert: true, new: true });
await Coupon.findOneAndUpdate({ code: 'WELCOME20' }, { $set: { type: 'percent', value: 20, active: true, perUserLimit: 1 } }, { upsert: true, new: true });

logger.info('Seed complete', {
  admin: admin?.email || 'skipped (no admin credentials configured)',
  courses: await Course.countDocuments(),
  coupons: await Coupon.countDocuments(),
  collections: [User, Order, Enrollment, Notification, Review, LessonProgress, WebhookEvent].map((m) => m.collection.name),
});
await mongoose.connection.close();
