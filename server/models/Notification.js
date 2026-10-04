import mongoose from 'mongoose';
const s = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: String, // legacy short type, e.g. 'PAYMENT' | 'REFUND'
  title: String, // newer, human-readable headline
  message: String,
  link: String, // in-app deep link, e.g. /purchases
  key: { type: String }, // idempotency key so the same notification is never duplicated
  read: { type: Boolean, default: false },
}, { timestamps: true });
s.index({ user: 1, createdAt: -1 });
s.index({ key: 1 }, { unique: true, sparse: true });
export default mongoose.model('Notification', s);
