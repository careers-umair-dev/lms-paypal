import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Play, RotateCw } from 'lucide-react';
import api, { errMsg } from '../api';
import { Thumb } from '../ui';

export default function MyCourses() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api.get('/enrollments').then((r) => { if (active) setList(r.data); })
      .catch((e) => { if (active) { setError(errMsg(e, 'Your learning could not be loaded.')); setList([]); } });
    return () => { active = false; };
  }, [retry]);

  const courses = useMemo(() => (list || []).filter((entry) => entry.course), [list]);
  const completeCount = courses.filter((entry) => entry.progress >= 100).length;
  const activeCount = courses.length - completeCount;
  const visibleCourses = courses.filter((entry) => filter === 'all'
    || (filter === 'complete' ? entry.progress >= 100 : entry.progress < 100));

  if (!list) return <div role="status" className="card">Loading your learning…</div>;
  return (<div className="space-y-7 md:space-y-9">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">YOUR LEARNING</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">My courses</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Pick up where you left off and keep your momentum.</p></div>
      <Link to="/" className="btn"><BookOpen className="h-4 w-4" /> Explore courses</Link>
    </header>

    <section aria-label="Learning summary" className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-4 dark:divide-slate-800 dark:border-slate-800">
      <div className="px-3 first:pl-0"><p className="text-2xl font-bold">{courses.length}</p><p className="text-sm text-slate-500">Enrolled</p></div>
      <div className="px-3"><p className="text-2xl font-bold">{activeCount}</p><p className="text-sm text-slate-500">In progress</p></div>
      <div className="px-3"><p className="flex items-center gap-2 text-2xl font-bold"><CheckCircle2 className="h-5 w-5 text-teal-700" />{completeCount}</p><p className="text-sm text-slate-500">Completed</p></div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">Your learning paths</h2>
      <div role="group" aria-label="Filter courses" className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-800">
        {[['all', 'All'], ['active', 'In progress'], ['complete', 'Completed']].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${filter === value ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</button>))}
      </div>
    </div>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-rose-600 bg-rose-50 p-4 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
      <p>{error}</p><button className="btn" onClick={() => { setError(''); setList(null); setRetry((value) => value + 1); }}><RotateCw className="h-4 w-4" /> Retry</button>
    </div>}

    {!error && !courses.length ? <div className="border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
      <BookOpen className="mx-auto h-9 w-9 text-teal-700" /><h2 className="mt-3 text-lg font-bold">Your learning starts here</h2>
      <p className="mt-1 text-sm text-slate-500">Explore the catalog and enroll in a course to see your progress here.</p>
      <Link to="/" className="btn mt-5">Browse courses <ArrowRight className="h-4 w-4" /></Link>
    </div> : !visibleCourses.length ? <p className="py-8 text-center text-slate-500">No courses match this filter.</p> : (
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleCourses.map((entry) => {
          const progress = Math.min(100, Math.max(0, Math.round(entry.progress || 0)));
          const complete = progress === 100;
          return (<article key={entry._id} className="card flex flex-col gap-4 sm:flex-row">
            <Thumb title={entry.course.title} thumbnail={entry.course.thumbnail} className="h-32 shrink-0 rounded-lg sm:w-36" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-400">{entry.course.category || 'COURSE'}</p>
                <h3 className="mt-1 line-clamp-2 font-bold">{entry.course.title}</h3>
              </div>{complete && <CheckCircle2 aria-label="Completed" className="h-5 w-5 shrink-0 text-teal-700" />}</div>
              <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>{complete ? 'Course complete' : progress ? 'In progress' : 'Ready to start'}</span><span>{progress}%</span></div>
                <div role="progressbar" aria-label={`${entry.course.title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-teal-700 transition-[width]" style={{ width: `${progress}%` }} />
                </div></div>
              <Link to={`/courses/${entry.course._id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300">
                {complete ? <><CheckCircle2 className="h-4 w-4" /> Review course</> : <><Play className="h-4 w-4" /> {progress ? 'Continue learning' : 'Start learning'}</>}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>);
        })}
      </div>
    )}
  </div>);
}
