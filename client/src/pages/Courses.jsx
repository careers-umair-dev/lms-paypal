import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Search, Star } from 'lucide-react';
import api, { errMsg, money } from '../api';
import { Badge, Skeleton, Thumb } from '../ui';

const list = { show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Courses() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { setPage(1); }, [type, category, sort, search]);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    api.get('/courses', { params: { q: search || undefined, premium: type, category, sort, page } })
      .then((r) => setData(r.data))
      .catch((e) => setErr(errMsg(e, 'Could not load courses.')))
      .finally(() => setLoading(false));
  }, [search, type, category, sort, page]);

  useEffect(() => { load(); }, [load]);
  const categories = data?.categories || [];
  const shown = data?.items || [];
  return (<div className="space-y-7 md:space-y-9">
    <section className="border-b border-slate-200 pb-6 dark:border-slate-800 md:pb-8">
      <p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">LEARN AT YOUR PACE</p>
      <div className="mt-2 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Find your next course</h1>
          <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">Practical lessons, expert-led paths, and a clear way to track what you learn.</p></div>
        <div className="relative w-full md:max-w-sm"><Search aria-hidden className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input aria-label="Search courses" className="input pl-10" placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
    </section>
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      {[['all', 'All'], ['free', 'Free'], ['premium', 'Premium']].map(([k, l]) => (
        <button key={k} aria-pressed={type === k} onClick={() => setType(k)} className={`chip ${type === k ? 'chip-on' : ''}`}>{l}</button>))}
      {categories.length > 1 && <select aria-label="Category" className="input w-full sm:w-44" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
      <select aria-label="Sort courses" className="input w-full sm:ml-auto sm:w-48" value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="newest">Newest</option><option value="oldest">Oldest</option>
        <option value="priceLow">Price: low to high</option><option value="priceHigh">Price: high to low</option></select>
    </div>
    {err ? <div role="alert" className="card space-y-3"><p>{err}</p><button className="btn" onClick={load}>Retry</button></div>
      : loading && !data ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="card space-y-3 !p-0"><Skeleton className="h-40 !rounded-b-none" /><div className="space-y-2 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/3" /></div></div>)}</div>)
      : !shown.length ? (<div className="card flex flex-col items-center gap-2 py-12 text-center"><BookOpen className="h-10 w-10 text-slate-400" /><p className="font-semibold">No courses found</p><p className="text-sm text-slate-500">Try a different search or filter.</p></div>)
      : (<>
        <div className="flex items-center justify-between text-sm text-slate-500"><span>{data.total} courses</span>{loading && <span role="status">Updating results…</span>}</div>
        <motion.div variants={list} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (<motion.div key={c._id} variants={item} whileHover={{ y: -4 }} transition={{ duration: 0.15 }}>
            <Link to={`/courses/${c._id}`} className="card group flex h-full flex-col overflow-hidden !p-0 transition-shadow hover:shadow-md">
              <Thumb title={c.title} thumbnail={c.thumbnail} className="h-40" />
              <div className="flex flex-1 flex-col gap-3 p-4"><div className="flex items-start justify-between gap-2"><h2 className="font-semibold leading-snug">{c.title}</h2>
                {c.isPremium ? <Badge tone="indigo">Premium</Badge> : <Badge tone="green">Free</Badge>}</div>
                {c.ratingCount > 0 && <p className="flex items-center gap-1 text-xs text-slate-500"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{c.rating} ({c.ratingCount})</p>}
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{c.description}</p>
                <p className="text-xs text-slate-500">{c.category} · {c.level} · {c.lessonCount} lessons</p>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800"><p className="font-bold">{c.isPremium ? money(c.priceMinor, c.currency) : 'Free'}</p><span className="flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-400">Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></div>
            </Link></motion.div>))}
        </motion.div>
        {data.pages > 1 && <div className="flex items-center justify-center gap-3">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-sm text-slate-500">Page {data.page} of {data.pages} · {data.total} courses</span>
          <button className="btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>}
      </>)}
  </div>);
}
