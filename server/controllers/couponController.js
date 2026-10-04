import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import { priceFor } from '../services/pricingService.js';
import { isCourseVisible } from '../utils/courseVisibility.js';
export async function preview(req, res, next) {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course || !course.isPremium) return res.status(404).json({ message: 'Premium course not found' });
    const enrolled = await Enrollment.exists({ user: req.user.id, course: course._id, status: 'ACTIVE' });
    if (!isCourseVisible(course, req.user, !!enrolled)) return res.status(404).json({ message: 'Premium course not found' });
    res.json(await priceFor(course, req.body.code, req.user.id));
  } catch (e) { next(e); }
}
export async function create(req, res, next) {
  try {
    const b = req.body; const fixed = b.type === 'fixed';
    const value = fixed ? Math.round(Number(b.value) * 100) : Number(b.value);
    if (!fixed && (value < 1 || value > 99)) return res.status(400).json({ message: 'Percent must be 1-99' });
    if (fixed && !b.currency) return res.status(400).json({ message: 'Currency required for fixed coupons' });
    res.status(201).json(await Coupon.create({ code: b.code, type: b.type, value, currency: b.currency,
      expiresAt: b.expiresAt || undefined, usageLimit: +b.usageLimit || undefined, perUserLimit: +b.perUserLimit || undefined }));
  } catch (e) { next(e.code === 11000 ? Object.assign(new Error('Coupon code already exists'), { status: 409 }) : e); }
}
export const list = async (_q, res, next) => { try { res.json(await Coupon.find().sort('-createdAt')); } catch (e) { next(e); } };
export async function setActive(req, res, next) {
  try { res.json(await Coupon.findByIdAndUpdate(req.params.id, { active: !!req.body.active }, { new: true })); } catch (e) { next(e); }
}
export const notifications = async (req, res, next) => {
  try {
    const items = await Notification.find({ user: req.user.id }).sort('-createdAt').limit(20);
    res.json({ items, unread: await Notification.countDocuments({ user: req.user.id, read: false }) });
  } catch (e) { next(e); }
};
export const markRead = async (req, res, next) => {
  try { await Notification.updateMany({ user: req.user.id, read: false }, { read: true }); res.json({ ok: true }); } catch (e) { next(e); }
};
