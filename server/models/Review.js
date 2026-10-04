import mongoose from 'mongoose';
const s = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 }, // whole stars only
  comment: { type: String, trim: true, maxlength: 2000, default: '' },
}, { timestamps: true });
s.index({ user: 1, course: 1 }, { unique: true }); // one review per user per course
s.index({ course: 1, createdAt: -1 });
export default mongoose.model('Review', s);
