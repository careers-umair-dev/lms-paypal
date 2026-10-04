import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';
export const Skeleton = ({ className = '' }) => <div aria-hidden className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
export const Badge = ({ tone = 'slate', children }) => {
  const t = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    indigo: 'bg-gradient-to-r from-teal-100 to-cyan-100 text-teal-900 dark:from-teal-900/70 dark:to-cyan-950/70 dark:text-teal-100',
  }[tone] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
};
// Deterministic gradient thumbnail from the course title (no external images needed).
export function Thumb({ title = '', thumbnail = '', className = '' }) {
  const palettes = [
    ['#0f766e', '#164e63'], ['#0369a1', '#0f766e'], ['#047857', '#155e75'],
    ['#a16207', '#0f766e'], ['#0e7490', '#1e3a5f'],
  ];
  const palette = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
  const [start, end] = palettes[palette];
  return (<div aria-hidden className={`relative flex items-center justify-center overflow-hidden text-4xl font-black text-white/90 ${className}`}
    style={{ background: `linear-gradient(125deg, ${start} 0%, ${end} 100%)` }}>
    <span>{title.trim().charAt(0).toUpperCase() || '•'}</span>
    {thumbnail && <img src={thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
    {thumbnail && <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950/25 via-transparent to-white/10" />}
  </div>);
}
export function CountUp({ value, format = (v) => Math.round(v) }) {
  const [n, setN] = useState(0);
  useEffect(() => { const c = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setN }); return () => c.stop(); }, [value]);
  return <>{format(n)}</>;
}
