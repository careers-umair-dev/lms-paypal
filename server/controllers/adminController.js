import Order from '../models/Order.js';
const sum = (match) => Order.aggregate([{ $match: match }, { $group: { _id: null, t: { $sum: { $subtract: ['$amountMinor', '$refundedMinor'] } }, n: { $sum: 1 } } }]);
export async function stats(req, res, next) {
  try {
    const currency = ['USD', 'EUR', 'GBP'].includes(req.query.currency) ? req.query.currency : 'USD';
    const now = new Date(), week = new Date(now - 7 * 864e5), month = new Date(now.getFullYear(), now.getMonth(), 1);
    const done = { currency, status: { $in: ['COMPLETED', 'PARTIALLY_REFUNDED'] } };
    const [all, wk, mo, refunds, statuses, byCourse, byDay] = await Promise.all([
      sum(done), sum({ ...done, completedAt: { $gte: week } }), sum({ ...done, completedAt: { $gte: month } }),
      Order.aggregate([{ $match: { currency, status: { $in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } } },
        { $group: { _id: null, t: { $sum: '$refundedMinor' }, n: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { currency } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Order.aggregate([{ $match: done }, { $group: { _id: '$course', revenue: { $sum: { $subtract: ['$amountMinor', '$refundedMinor'] } }, sales: { $sum: 1 } } },
        { $sort: { revenue: -1 } }, { $limit: 10 },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'c' } },
        { $project: { revenue: 1, sales: 1, title: { $ifNull: [{ $arrayElemAt: ['$c.title', 0] }, 'Deleted course'] } } }]),
      Order.aggregate([{ $match: { ...done, completedAt: { $gte: new Date(now - 30 * 864e5) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, revenue: { $sum: { $subtract: ['$amountMinor', '$refundedMinor'] } } } },
        { $sort: { _id: 1 } }]),
    ]);
    const g = (r) => ({ total: r[0]?.t || 0, count: r[0]?.n || 0 });
    res.json({ currency, netRevenue: g(all), week: g(wk), month: g(mo), refunds: g(refunds),
      statuses: Object.fromEntries(statuses.map((s) => [s._id, s.n])), byCourse, byDay });
  } catch (e) { next(e); }
}
