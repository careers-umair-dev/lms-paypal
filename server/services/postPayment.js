import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import { sendEmail } from './emailService.js';
// Side effects must never break payment processing: all errors are swallowed and logged.
async function run(order, type, message, subject, title) {
  try {
    const o = await Order.findById(order._id).populate('user', 'name email').populate('course', 'title');
    await Notification.create({ user: o.user._id, type, message });
    await sendEmail(o.user.email, subject, title, [`Hi ${o.user.name},`, message,
      `Course: ${o.course?.title || 'Course'}`, `Amount: ${(o.amountMinor / 100).toFixed(2)} ${o.currency}`]);
  } catch (e) { console.error('post-payment side effect failed:', e.message); }
}
export const onPaid = (o) => run(o, 'PAYMENT_SUCCESS', 'Your payment was successful. You now have access to this course.', 'Payment confirmation', 'Payment successful');
export const onRefunded = (o) => run(o, 'REFUND', 'Your refund has been processed.', 'Refund processed', 'Refund processed');
export const onFailed = (o) => run(o, 'PAYMENT_FAILED', 'Your payment could not be completed. If you were charged, please contact support and quote your order reference.', 'Payment could not be completed', 'Payment could not be completed');
