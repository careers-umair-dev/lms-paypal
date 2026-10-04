import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['Admin', 'Instructor', 'Student'], default: 'Student' },
}, { timestamps: true });
s.pre('save', async function (n) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  n();
});
s.methods.matches = function (p) { return bcrypt.compare(p, this.password); };
export default mongoose.model('User', s);
