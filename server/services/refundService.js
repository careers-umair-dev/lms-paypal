import Order from '../models/Order.js';
import { revokeAccess } from './enrollmentService.js';
import { onRefunded } from './postPayment.js';
// Idempotent per refundId: the admin API and the PayPal webhook can both call this for the same refund safely.
export async function settleRefund(order, refundId, amountMinor) {
  const amt = Math.min(amountMinor, order.amountMinor - order.refundedMinor);
  if (!(amt > 0) || !refundId) return null;
  let upd = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ['COMPLETED', 'PARTIALLY_REFUNDED'] }, refundIds: { $ne: refundId },
      refundedMinor: { $lte: order.amountMinor - amt } }, // never exceed the paid amount
    { $inc: { refundedMinor: amt }, $push: { refundIds: refundId }, $set: { status: 'PARTIALLY_REFUNDED', refundedAt: new Date() } },
    { new: true });
  if (!upd) return null; // already applied, or not refundable
  if (upd.refundedMinor >= upd.amountMinor) { // full refund: revoke access
    upd = (await Order.findOneAndUpdate({ _id: upd._id, status: 'PARTIALLY_REFUNDED' }, { status: 'REFUNDED' }, { new: true })) || upd;
    await revokeAccess(upd);
  }
  await onRefunded(upd);
  return upd;
}
