import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { isCourseVisible } from '../utils/courseVisibility.js';
// Expects auth middleware to set req.user = {id, role}. Sets req.course on success.
export default async function requireCourseAccess(req, res, next) {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const staff = ['Admin', 'Instructor'].includes(req.user?.role);
    const enrolled = req.user && await Enrollment.exists({ user: req.user.id, course: course._id, status: 'ACTIVE' });
    if (!isCourseVisible(course, req.user, !!enrolled)) return res.status(404).json({ message: 'Course not found' });
    if (course.isPremium) {
      if (!req.user) return res.status(401).json({ message: 'Login required' });
      const owned = staff || enrolled;
      if (!owned) return res.status(403).json({ message: 'Purchase required' });
    }
    req.course = course; next();
  } catch (e) { next(e); }
}
