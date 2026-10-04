import mongoose from 'mongoose';
const s = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  category: { type: String, trim: true, default: 'General' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  thumbnail: { type: String, default: '' }, // optional relative key or absolute https URL
  isPremium: { type: Boolean, default: false },
  priceMinor: { type: Number, default: 0, min: 0, validate: Number.isInteger }, // cents
  currency: { type: String, enum: ['USD', 'EUR', 'GBP'], default: 'USD' },
  published: { type: Boolean, default: true },
  lessons: [{ title: { type: String, required: true, trim: true }, videoKey: String }], // private storage key, never a public URL
}, { timestamps: true });
s.index({ title: 'text', description: 'text' });
s.index({ createdAt: -1 });
s.pre('validate', function (n) {
  if (this.isPremium && !(this.priceMinor > 0)) this.invalidate('priceMinor', 'Premium needs price > 0');
  n();
});
export default mongoose.model('Course', s);
