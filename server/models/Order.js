import mongoose from 'mongoose';
import { TRANSITIONS, fromStates } from '../utils/stateMachine.js';
const s = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  provider: { type: String, enum: ['paypal', 'stripe', 'mock'], required: true },
  providerOrderId: { type: String, unique: true, sparse: true },
  providerTransactionId: { type: String, unique: true, sparse: true },
  amountMinor: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, enum: Object.keys(TRANSITIONS), default: 'PENDING', index: true },
  couponCode: { type: String, default: null }, discountMinor: { type: Number, default: 0 },
  completedAt: Date, refundedAt: Date, refundedMinor: { type: Number, default: 0 }, refundIds: [String], checkoutUrl: String,
}, { timestamps: true });
// Atomic, state-machine-checked transition. Returns updated doc or null if not allowed / race lost.
s.statics.transition = function (id, to, set = {}) {
  const from = fromStates(to);
  return this.findOneAndUpdate({ _id: id, status: { $in: from } }, { status: to, ...set }, { new: true });
};
export default mongoose.model('Order', s);
