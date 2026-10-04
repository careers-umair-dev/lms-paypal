import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import api, { money } from '../api';
import { useAuth } from '../AuthContext';

function Card({ label, value }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card border-l-4 border-l-teal-600"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-extrabold tracking-tight">{value}</p></motion.div>;
}
function NewCourse({ onDone }) {
  const [f, setF] = useState({ title: '', price: '', currency: 'USD', isPremium: true, lessons: '' });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/courses', { ...f, price: f.isPremium ? f.price : 0, lessons: f.lessons.split('\n').filter(Boolean).map((ln) => { const [title, videoKey] = ln.split('|').map((x) => x.trim()); return { title, videoKey }; }) }); toast.success('Course created'); onDone(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  return (<form onSubmit={submit} className="card flex flex-wrap items-end gap-2">
    <div><label htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
    <div><label htmlFor="pr">Price</label><input id="pr" type="number" step="0.01" min="0" className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
    <select aria-label="Currency" className="input w-24" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
      {['USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</select>
    <label className="flex items-center gap-1"><input type="checkbox" checked={f.isPremium} onChange={(e) => setF({ ...f, isPremium: e.target.checked })} /> Premium</label>
    <div className="w-full"><label htmlFor="ls">Lessons (one per line: Title | path/in/private/storage.mp4)</label><textarea id="ls" rows={3} className="input" value={f.lessons} onChange={(e) => setF({ ...f, lessons: e.target.value })} /></div>
    <button className="btn">Create course</button></form>);
}
function CourseManager({ canDelete, refreshToken }) {
  const [list, setList] = useState(null);
  const load = useCallback(() => api.get('/courses').then((r) => setList(r.data.items || [])).catch(() => setList([])), [refreshToken]);
  useEffect(() => { load(); }, [load]);
  const fail = (e) => toast.error(e.response?.data?.message || 'Failed');
  const del = async (c) => {
    if (!window.confirm(`Delete "${c.title}"? Students who bought it lose access to its content.`)) return;
    try { await api.delete(`/courses/${c._id}`); toast.success('Deleted'); load(); } catch (e) { fail(e); }
  };
  const price = async (c) => {
    const v = window.prompt(`New price for "${c.title}" (${c.currency})`, (c.priceMinor / 100).toFixed(2));
    if (v === null) return;
    try { await api.put(`/courses/${c._id}`, { price: v }); toast.success('Price updated'); load(); } catch (e) { fail(e); }
  };
  return (<div className="card space-y-2"><h2 className="font-semibold">Courses</h2>
    {!list ? <p>Loading…</p> : !list.length ? <p>No courses.</p> : list.map((c) => (
      <div key={c._id} className="flex flex-wrap items-center gap-3 border-t border-slate-200 py-2 dark:border-slate-700">
        <span className="flex-1">{c.title}</span><span>{c.isPremium ? money(c.priceMinor, c.currency) : 'Free'}</span>
        <button className="underline" onClick={() => price(c)}>Edit price</button>
        {canDelete && <button className="text-red-600 underline" onClick={() => del(c)}>Delete</button>}</div>))}</div>);
}
function NewCoupon() {
  const [f, setF] = useState({ code: '', type: 'percent', value: '', currency: 'USD', usageLimit: '', perUserLimit: '1' });
  const k = (n) => (e) => setF({ ...f, [n]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post('/coupons', f); toast.success('Coupon created'); } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  return (<form onSubmit={submit} className="card flex flex-wrap items-end gap-2">
    <div><label htmlFor="cc">Coupon code</label><input id="cc" className="input" required value={f.code} onChange={k('code')} /></div>
    <select aria-label="Type" className="input w-28" value={f.type} onChange={k('type')}><option value="percent">Percent</option><option value="fixed">Fixed</option></select>
    <div><label htmlFor="cv">Value</label><input id="cv" type="number" step="0.01" className="input w-24" required value={f.value} onChange={k('value')} /></div>
    {f.type === 'fixed' && <select aria-label="Coupon currency" className="input w-24" value={f.currency} onChange={k('currency')}>{['USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</select>}
    <div><label htmlFor="cl">Total uses</label><input id="cl" type="number" className="input w-24" value={f.usageLimit} onChange={k('usageLimit')} /></div>
    <div><label htmlFor="cu">Per user</label><input id="cu" type="number" className="input w-24" value={f.perUserLimit} onChange={k('perUserLimit')} /></div>
    <button className="btn">Create coupon</button></form>);
}
export default function Admin() {
  const { user } = useAuth();
  const [cur, setCur] = useState('USD'); const [s, setS] = useState(null);
  const [o, setO] = useState(null); const [page, setPage] = useState(1); const [status, setStatus] = useState('');
  const [q, setQ] = useState(''); const [qIn, setQIn] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [courseRefresh, setCourseRefresh] = useState(0);
  const isAdmin = user.role === 'Admin';
  const load = useCallback(() => {
    api.get('/admin/stats', { params: { currency: cur } }).then((r) => setS(r.data)).catch(() => toast.error('Stats failed'));
    api.get('/orders', { params: { page, status: status || undefined, q: q || undefined, from: from || undefined, to: to || undefined, sort } }).then((r) => setO(r.data)).catch(() => toast.error('Orders failed'));
  }, [cur, page, status, q, from, to, sort]);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  const refund = async (x) => {
    const left = x.amountMinor - (x.refundedMinor || 0);
    const v = window.prompt(`Refund amount in ${x.currency} (max ${(left / 100).toFixed(2)}). Leave blank for the full remaining amount. A full refund revokes course access.`, '');
    if (v === null) return;
    if (!window.confirm(`Refund ${v || (left / 100).toFixed(2)} ${x.currency} to ${x.user?.email}?`)) return;
    try { await api.post(`/orders/${x._id}/refund`, v ? { amount: v } : {}); toast.success('Refund processed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Refund failed'); }
  };
  const d = (v) => money(v, cur);
  return (<div className="space-y-6">
    <div className="flex items-center gap-3"><h1 className="text-2xl font-bold">{isAdmin ? 'Payments dashboard' : 'Instructor workspace'}</h1>
      {isAdmin && <select aria-label="Currency" className="input w-24" value={cur} onChange={(e) => setCur(e.target.value)}>{['USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}</select>}</div>
    {isAdmin && <>
    {s && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="Net revenue" value={d(s.netRevenue.total)} /><Card label="This month" value={d(s.month.total)} />
        <Card label="This week" value={d(s.week.total)} /><Card label="Successful" value={s.netRevenue.count} />
        <Card label="Refunded" value={`${d(s.refunds.total)} (${s.refunds.count})`} /></div>
      <p className="text-sm text-slate-500">Failed: {s.statuses.FAILED || 0} · Pending/Created: {(s.statuses.PENDING || 0) + (s.statuses.CREATED || 0)}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-64"><p className="mb-2 font-semibold">Revenue, last 30 days</p><ResponsiveContainer><LineChart data={s.byDay.map((x) => ({ day: x._id, v: x.revenue / 100 }))}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey="v" stroke="#0f766e" /></LineChart></ResponsiveContainer></div>
        <div className="card h-64"><p className="mb-2 font-semibold">Sales by course</p><ResponsiveContainer><BarChart data={s.byCourse.map((x) => ({ t: x.title, v: x.revenue / 100 }))}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" /><YAxis /><Tooltip /><Bar dataKey="v" fill="#0f766e" /></BarChart></ResponsiveContainer></div>
      </div></>}
    </>}
    <NewCourse onDone={() => setCourseRefresh((value) => value + 1)} />
    <CourseManager canDelete={isAdmin} refreshToken={courseRefresh} />
    {isAdmin && <>
    <NewCoupon />
    <div className="card space-y-3"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Transactions</h2>
      <select aria-label="Status filter" className="input w-40" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
        <option value="">All</option>{['COMPLETED', 'PENDING', 'CREATED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((x) => <option key={x}>{x}</option>)}</select>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qIn); }}>
          <input aria-label="Search transactions" className="input w-48" placeholder="Search email, course, ID" value={qIn} onChange={(e) => setQIn(e.target.value)} />
          <button className="btn">Search</button></form>
        <input aria-label="From date" type="date" className="input w-40" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
        <input aria-label="To date" type="date" className="input w-40" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        <select aria-label="Sort by" className="input w-36" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="createdAt">Newest</option><option value="amountMinor">Amount</option><option value="status">Status</option></select></div>
      {!o ? <p>Loading…</p> : !o.items.length ? <p>No transactions.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th>Transaction</th><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>{o.items.map((x) => (<tr key={x._id} className="border-t border-slate-200 dark:border-slate-700">
          <td className="break-all py-2">{x.providerTransactionId || '-'}</td><td>{x.user?.email}</td><td>{x.course?.title || 'Deleted'}</td>
          <td>{money(x.amountMinor, x.currency)}</td><td>{x.status}{x.refundedMinor > 0 && ` (refunded ${money(x.refundedMinor, x.currency)})`}</td><td>{new Date(x.createdAt).toLocaleDateString()}</td>
          <td>{['COMPLETED', 'PARTIALLY_REFUNDED'].includes(x.status) && <button className="underline text-red-600" onClick={() => refund(x)}>Refund</button>}</td></tr>))}</tbody></table></div>}
      <div className="flex gap-2"><button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <button className="btn" disabled={!o || page >= o.pages} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </>}
  </div>);
}
