import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const read = async (req) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!t) return null;
  try {
    const { id } = jwt.verify(t, process.env.JWT_SECRET);
    const u = await User.findById(id);
    return u ? { id: String(u._id), role: u.role, name: u.name, email: u.email } : null;
  } catch { return null; }
};
export const auth = async (req, res, next) => {
  req.user = await read(req);
  return req.user ? next() : res.status(401).json({ message: 'Authentication required' });
};
export const optionalAuth = async (req, _res, next) => { req.user = await read(req); next(); };
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Forbidden' });
