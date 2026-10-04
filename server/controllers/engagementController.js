import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Review from '../models/Review.js';
import LessonProgress from '../models/LessonProgress.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

// Only students who actually own the course (or staff) may review it.
async function assertReviewer(req) {
  const course = await Course.findById(req.params.id);
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
  const staff = ['Admin', 'Instructor'].includes(req.user.role);
  const owned = staff || await Enrollment.exists({ user: req.user.id, course: course._id, status: 'ACTIVE' });
  if (!owned) throw Object.assign(new Error('Purchase required to review this course'), { status: 403 });
  return course;
}

export const listReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(50, +req.query.limit || 10);
  const filter = { course: req.params.id };
  const [items, total, agg] = await Promise.all([
    Review.find(filter).populate('user', 'name').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$course', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
  ]);
  res.json({
    items, total, page, pages: Math.ceil(total / limit) || 1,
    average: agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0,
    count: agg[0]?.n || 0,
  });
});

// Upsert so re-submitting edits the existing review instead of hitting the unique index.
export const upsertReview = asyncHandler(async (req, res) => {
  const course = await assertReviewer(req);
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw bad('Rating must be a whole number from 1 to 5');
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 2000) : '';
  const review = await Review.findOneAndUpdate(
    { user: req.user.id, course: course._id },
    { $set: { rating, comment } },
    { new: true, upsert: true, runValidators: true },
  );
  res.status(201).json(review);
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  const mine = String(review.user) === req.user.id;
  if (!mine && req.user.role !== 'Admin') throw Object.assign(new Error('Forbidden'), { status: 403 });
  await review.deleteOne();
  res.json({ message: 'Deleted' });
});

// Recomputes Enrollment.progress from the completed-lesson set (source of truth = LessonProgress).
export const recomputeProgress = asyncHandler(async (userId, courseId) => {
  const [course, done] = await Promise.all([
    Course.findById(courseId).select('lessons'),
    LessonProgress.countDocuments({ user: userId, course: courseId }),
  ]);
  const total = course?.lessons.length || 0;
  const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  await Enrollment.updateOne({ user: userId, course: courseId }, { $set: { progress } });
  return progress;
});

export const markLessonComplete = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (!course.lessons.id(req.params.lessonId)) return res.status(404).json({ message: 'Lesson not found' });
  const staff = ['Admin', 'Instructor'].includes(req.user.role);
  let enrollment = await Enrollment.findOne({ user: req.user.id, course: course._id, status: 'ACTIVE' });
  if (!staff && course.isPremium && !enrollment) return res.status(403).json({ message: 'Purchase required' });
  if (!staff && !course.isPremium && !enrollment) {
    enrollment = await Enrollment.findOneAndUpdate(
      { user: req.user.id, course: course._id },
      { $set: { status: 'ACTIVE' }, $setOnInsert: { user: req.user.id, course: course._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  await LessonProgress.findOneAndUpdate(
    { user: req.user.id, lesson: req.params.lessonId },
    { $setOnInsert: { user: req.user.id, course: course._id, lesson: req.params.lessonId } },
    { upsert: true, new: true },
  );
  const progress = await recomputeProgress(req.user.id, course._id);
  if (progress === 100) {
    await Notification.findOneAndUpdate(
      { user: req.user.id, key: `course-done:${course._id}` },
      { $setOnInsert: { user: req.user.id, key: `course-done:${course._id}`, title: 'Course completed 🎉', body: `You finished "${course.title}".`, link: `/courses/${course._id}` } },
      { upsert: true },
    );
  }
  res.json({ progress });
});

export const myProgress = asyncHandler(async (req, res) => {
  const courseId = req.params.courseId;
  const [enrollment, lessons] = await Promise.all([
    Enrollment.findOne({ user: req.user.id, course: courseId }),
    LessonProgress.find({ user: req.user.id, course: courseId }).select('lesson'),
  ]);
  res.json({
    progress: enrollment?.progress ?? 0,
    completed: lessons.map((l) => String(l.lesson)),
  });
});
