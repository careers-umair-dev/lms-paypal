import Course from '../models/Course.js';
import { verifyMedia, safePath, mediaSecret } from '../utils/signedUrl.js';
// Link-based access (video tags can't send auth headers). Links are short-lived and bound to course+lesson+user.
export async function serve(req, res, next) {
  try {
    const { courseId, lessonId } = req.params, { u, exp, sig } = req.query;
    if (!verifyMedia({ courseId, lessonId, userId: u, exp }, sig, mediaSecret()))
      return res.status(403).json({ message: 'Link expired or invalid' });
    const course = await Course.findById(courseId).catch(() => null);
    const l = course?.lessons.id(lessonId);
    const file = l && process.env.MEDIA_DIR && safePath(process.env.MEDIA_DIR, l.videoKey);
    if (!file) return res.status(404).json({ message: 'Media not found' });
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(file, (err) => { if (err && !res.headersSent) res.status(404).json({ message: 'Media not found' }); });
  } catch (e) { next(e); }
}
