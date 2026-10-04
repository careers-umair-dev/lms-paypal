import Enrollment from '../models/Enrollment.js';
// Idempotent upsert on unique (user, course). Call ONLY after a verified COMPLETED order.
export const grantAccess = (order) => Enrollment.findOneAndUpdate(
  { user: order.user, course: order.course },
  { $set: { status: 'ACTIVE', order: order._id } }, { upsert: true, new: true });
export const revokeAccess = (order) => Enrollment.updateOne(
  { user: order.user, course: order.course }, { status: 'REVOKED' });
