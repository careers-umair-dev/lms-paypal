import mongoose from 'mongoose';
const s = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, required: true },
  completedAt: { type: Date, default: () => new Date() },
}, { timestamps: true });
s.index({ user: 1, lesson: 1 }, { unique: true }); // re-watching a lesson never inflates progress
s.index({ user: 1, course: 1 });
export default mongoose.model('LessonProgress', s);
