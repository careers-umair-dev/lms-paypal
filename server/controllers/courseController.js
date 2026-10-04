import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Review from '../models/Review.js';
import { signMedia, mediaSecret } from '../utils/signedUrl.js';
import { isCourseVisible } from '../utils/courseVisibility.js';
const CUR = ['USD', 'EUR', 'GBP'];
const staff = (u) => u && ['Admin', 'Instructor'].includes(u.role);
const rx = (t) => new RegExp(String(t).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const publicView = (c) => ({ _id: c._id, title: c.title, description: c.description, category: c.category,
  level: c.level, thumbnail: c.thumbnail, isPremium: c.isPremium, priceMinor: c.priceMinor,
  currency: c.currency, lessonCount: c.lessons.length, lessonTitles: c.lessons.map((l) => l.title) });
function parse(b) {
  const out = {};
  if (b.title !== undefined) out.title = String(b.title).trim();
  if (b.description !== undefined) out.description = String(b.description).slice(0, 5000);
  if (b.category !== undefined) out.category = String(b.category).trim().slice(0, 60) || 'General';
  if (b.level !== undefined) {
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(b.level)) throw Object.assign(new Error('Invalid level'), { status: 400 });
    out.level = b.level;
  }
  if (b.thumbnail !== undefined) out.thumbnail = String(b.thumbnail).slice(0, 500);
  if (b.published !== undefined) out.published = !!b.published;
  if (b.isPremium !== undefined) out.isPremium = !!b.isPremium;
  if (b.price !== undefined) { // price in major units from admin; stored as integer minor units
    const n = Math.round(Number(b.price) * 100);
    if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error('Invalid price'), { status: 400 });
    out.priceMinor = n;
  }
  if (b.currency !== undefined) {
    if (!CUR.includes(b.currency)) throw Object.assign(new Error('Unsupported currency'), { status: 400 });
    out.currency = b.currency;
  }
  if (Array.isArray(b.lessons)) out.lessons = b.lessons.map((l) => {
    if (typeof l.videoKey === 'string' && (/^[a-z]+:/i.test(l.videoKey) || l.videoKey.includes('..')))
      throw Object.assign(new Error('videoKey must be a relative private-storage path'), { status: 400 });
    return { title: l.title, videoKey: l.videoKey };
  });
  return out;
}
// Public catalogue: text search, category/level filters, paging and rating summary.
export async function list(req, res, next) {
  try {
    const page = Math.max(1, +req.query.page || 1), limit = Math.min(50, +req.query.limit || 12);
    const q = {};
    if (!staff(req.user)) q.published = { $ne: false };
    if (req.query.q) q.$text = { $search: String(req.query.q).slice(0, 80) };
    else if (req.query.search) q.title = { $regex: rx(req.query.search), $options: 'i' };
    if (req.query.category && req.query.category !== 'all') q.category = String(req.query.category);
    if (req.query.level && req.query.level !== 'all') q.level = String(req.query.level);
    if (req.query.premium === 'free') q.isPremium = false;
    if (req.query.premium === 'premium') q.isPremium = true;
    const priceSort = req.query.sort === 'priceLow' ? { priceMinor: 1 } : req.query.sort === 'priceHigh' ? { priceMinor: -1 } : null;
    const sort = priceSort || { createdAt: req.query.sort === 'oldest' ? 1 : -1 };
    const [items, total, cats] = await Promise.all([
      Course.find(q).sort(sort).skip((page - 1) * limit).limit(limit),
      Course.countDocuments(q),
      Course.distinct('category', { published: { $ne: false } }),
    ]);
    const ratings = await Review.aggregate([{ $match: { course: { $in: items.map((c) => c._id) } } },
      { $group: { _id: '$course', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
    const map = new Map(ratings.map((r) => [String(r._id), r]));
    res.json({
      items: items.map((c) => ({ ...publicView(c),
        rating: Math.round((map.get(String(c._id))?.avg || 0) * 10) / 10, ratingCount: map.get(String(c._id))?.n || 0 })),
      total, page, pages: Math.ceil(total / limit) || 1, categories: cats.sort(),
    });
  } catch (e) { next(e); }
}
export async function categories(_req, res, next) {
  try { res.json((await Course.distinct('category', { published: { $ne: false } })).sort()); } catch (e) { next(e); }
}
export async function get(req, res, next) {
  try {
    const c = await Course.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Course not found' });
    const enrolled = req.user && await Enrollment.exists({ user: req.user.id, course: c._id, status: 'ACTIVE' });
    if (!isCourseVisible(c, req.user, !!enrolled)) return res.status(404).json({ message: 'Course not found' });
    const owned = !c.isPremium || staff(req.user) ||
      enrolled;
    const agg = await Review.aggregate([{ $match: { course: c._id } },
      { $group: { _id: '$course', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
    const base = { ...publicView(c), owned: !!owned, rating: Math.round((agg[0]?.avg || 0) * 10) / 10, ratingCount: agg[0]?.n || 0 };
    res.json(owned ? { ...base, lessons: c.lessons.map((l) => ({ _id: l._id, title: l.title })) } : base);
  } catch (e) { next(e); }
}
// Used behind requireCourseAccess. Returns a 5-minute signed link, never the storage key.
export function lesson(req, res) {
  const l = req.course.lessons.id(req.params.lessonId);
  if (!l) return res.status(404).json({ message: 'Lesson not found' });
  const p = { courseId: String(req.course._id), lessonId: String(l._id), userId: req.user?.id || 'anon', exp: Date.now() + 5 * 60 * 1000 };
  const mediaUrl = l.videoKey ? `/api/media/${p.courseId}/${p.lessonId}?u=${p.userId}&exp=${p.exp}&sig=${signMedia(p, mediaSecret())}` : null;
  res.json({ _id: l._id, title: l.title, mediaUrl });
}
export async function create(req, res, next) {
  try { res.status(201).json(await Course.create(parse(req.body))); } catch (e) { next(e); }
}
export async function update(req, res, next) {
  try {
    const c = await Course.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Course not found' });
    Object.assign(c, parse(req.body)); await c.save(); res.json(c);
  } catch (e) { next(e); }
}
export async function remove(req, res, next) {
  try { await Course.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (e) { next(e); }
}
