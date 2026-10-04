import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { applyCoupon } from '../utils/discount.js';
const bad = (m) => Object.assign(new Error(m), { status: 400 });
// Single source of truth for what a user pays. Never uses client-supplied amounts.
export async function priceFor(course, rawCode, userId) {
  const list = course.priceMinor;
  if (!rawCode) return { amountMinor: list, discountMinor: 0, code: null };
  const c = await Coupon.findOne({ code: String(rawCode).trim().toUpperCase(), active: true });
  if (!c || (c.expiresAt && c.expiresAt < new Date())) throw bad('Invalid or expired coupon');
  const used = (q) => Order.countDocuments({ couponCode: c.code, status: { $in: ['COMPLETED', 'PARTIALLY_REFUNDED'] }, ...q });
  if (c.usageLimit && (await used({})) >= c.usageLimit) throw bad('Coupon usage limit reached');
  if (c.perUserLimit && (await used({ user: userId })) >= c.perUserLimit) throw bad('You have already used this coupon');
  return { ...applyCoupon(c, list, course.currency), code: c.code };
}
