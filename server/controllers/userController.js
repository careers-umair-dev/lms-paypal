import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Lets a user update their own non-sensitive fields. Email/role changes are deliberately not exposed here.
export const updateProfile = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
  if (name.length < 2) throw Object.assign(new Error('Name must be at least 2 characters'), { status: 400 });
  const user = await User.findByIdAndUpdate(req.user.id, { $set: { name } }, { new: true });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});
export default { updateProfile };
