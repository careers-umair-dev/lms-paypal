import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const emailOk = (e) => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !emailOk(email) || typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ message: 'Valid name, email and password (8+ chars) required' });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });
    const u = await User.create({ name, email, password }); // role is never taken from client
    res.status(201).json({ token: sign(u), user: pub(u) });
  } catch (e) { next(e); }
}
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const u = emailOk(email) && await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!u || typeof password !== 'string' || !(await u.matches(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: sign(u), user: pub(u) });
  } catch (e) { next(e); }
}
export const me = async (req, res) => res.json({ user: req.user });
export const logout = (_req, res) => res.json({ message: 'Logged out' }); // stateless JWT: client discards token
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const u = await User.findById(req.user.id).select('+password');
    if (typeof newPassword !== 'string' || newPassword.length < 8 || !(await u.matches(currentPassword)))
      return res.status(400).json({ message: 'Invalid current or new password' });
    u.password = newPassword; await u.save();
    res.json({ message: 'Password updated' });
  } catch (e) { next(e); }
}
