import mongoose from 'mongoose';
export default mongoose.model('Coupon', new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,30}$/ },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 1, validate: Number.isInteger }, // percent (1-99) or minor units
  currency: { type: String, enum: ['USD', 'EUR', 'GBP'] }, // required for fixed
  expiresAt: Date, usageLimit: Number, perUserLimit: Number,
  active: { type: Boolean, default: true },
}, { timestamps: true }));
