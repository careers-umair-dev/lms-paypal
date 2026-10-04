import Order from '../models/Order.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
const rx = (t) => new RegExp(String(t).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
export async function listOrders(req, res, next) {
  try {
    const page = Math.max(1, +req.query.page || 1), limit = Math.min(50, +req.query.limit || 10);
    const q = req.user.role === 'Admin' ? {} : { user: req.user.id };
    if (req.query.status) q.status = String(req.query.status);
    const from = new Date(req.query.from), to = new Date(req.query.to);
    if (!isNaN(from)) q.createdAt = { ...q.createdAt, $gte: from };
    if (!isNaN(to)) { to.setHours(23, 59, 59, 999); q.createdAt = { ...q.createdAt, $lte: to }; }
    if (req.query.q) {
      const t = rx(req.query.q);
      const [users, courses] = await Promise.all([
        req.user.role === 'Admin' ? User.find({ $or: [{ email: t }, { name: t }] }).limit(50).select('_id') : [],
        Course.find({ title: t }).limit(50).select('_id')]);
      q.$or = [{ providerTransactionId: t }, { providerOrderId: t }, { user: { $in: users.map((u) => u._id) } }, { course: { $in: courses.map((c) => c._id) } }];
    }
    const field = ['createdAt', 'amountMinor', 'status'].includes(req.query.sort) ? req.query.sort : 'createdAt';
    const sort = { [field]: req.query.dir === 'asc' ? 1 : -1 };
    const [items, total] = await Promise.all([
      Order.find(q).populate('course', 'title').populate('user', 'name email').sort(sort).skip((page - 1) * limit).limit(limit),
      Order.countDocuments(q)]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
}
export async function getOrder(req, res, next) {
  try {
    const o = await Order.findById(req.params.id).populate('course', 'title');
    if (!o || (req.user.role !== 'Admin' && String(o.user) !== req.user.id)) return res.status(404).json({ message: 'Order not found' });
    res.json(o);
  } catch (e) { next(e); }
}
export const myEnrollments = async (req, res, next) => {
  try { res.json(await Enrollment.find({ user: req.user.id, status: 'ACTIVE' }).populate('course', 'title thumbnail category level description')); } catch (e) { next(e); }
};
export const myEnrollment = async (req, res, next) => {
  try {
    const e = await Enrollment.findOne({ user: req.user.id, course: req.params.courseId, status: 'ACTIVE' });
    e ? res.json(e) : res.status(404).json({ message: 'Not enrolled' });
  } catch (err) { next(err); }
};
import { streamInvoice } from '../services/invoiceService.js';
export async function invoice(req, res, next) {
  try {
    const o = await Order.findById(req.params.id).populate('course', 'title').populate('user', 'name email');
    if (!o || (req.user.role !== 'Admin' && String(o.user._id) !== req.user.id)) return res.status(404).json({ message: 'Order not found' });
    if (!o.completedAt) return res.status(409).json({ message: 'No invoice for unpaid order' });
    streamInvoice(o, o.user, res);
  } catch (e) { next(e); }
}
