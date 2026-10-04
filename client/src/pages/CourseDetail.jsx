import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, Lock, Play, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import api, { money } from '../api';
import { Badge, Thumb } from '../ui';
import { useAuth } from '../AuthContext';

const MEDIA_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
function loadPayPal(currency) {
  return new Promise((ok, fail) => {
    if (window.paypal && window.paypalCur === currency) return ok(window.paypal);
    document.querySelectorAll('script[data-pp]').forEach((s) => s.remove()); window.paypal = undefined;
    const s = document.createElement('script'); s.dataset.pp = '1';
    s.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=${currency}&intent=capture`;
    s.onload = () => { window.paypalCur = currency; ok(window.paypal); }; s.onerror = fail;
    document.body.appendChild(s);
  });
}
function Checkout({ course, onPaid }) {
  const box = useRef(null); const pending = useRef(null);
  const [state, setState] = useState('idle'); // idle | processing | unknown | error
  const [code, setCode] = useState(''); const [applied, setApplied] = useState(null);
  const mode = String(import.meta.env.VITE_PAYMENT_MODE || 'paypal').toLowerCase();
  const isMock = mode === 'mock';

  const apply = async () => {
    try {
      setApplied({ ...(await api.post('/coupons/preview', { courseId: course._id, code })).data });
      toast.success('Coupon applied');
    } catch (e) {
      setApplied(null);
      toast.error(e.response?.data?.message || 'Invalid coupon');
    }
  };

  const settleMock = useCallback(async (providerOrderId) => {
    setState('processing');
    try {
      const { data } = await api.post('/payments/mock/capture-order', { providerOrderId });
      if (data.status === 'COMPLETED') {
        toast.success('Demo payment successful. Course unlocked!');
        onPaid(data);
      } else {
        pending.current = providerOrderId;
        setState('unknown');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Demo payment failed');
      setState('error');
    }
  }, [onPaid]);

  const startMock = async () => {
    setState('processing');
    try {
      const { data } = await api.post('/payments/mock/create-order', {
        courseId: course._id,
        couponCode: applied?.code
      });
      pending.current = data.providerOrderId;
      await settleMock(data.providerOrderId);
    } catch (e) {
      setState('error');
      toast.error(e.response?.data?.message || 'Could not start demo payment');
    }
  };

  const settle = useCallback(async (providerOrderId) => {
    setState('processing');
    try {
      const { data, status } = await api.post('/payments/paypal/capture-order', { providerOrderId });
      if (status === 200 && data.status === 'COMPLETED') {
        toast.success('Payment successful. Course unlocked!');
        onPaid(data);
      } else {
        pending.current = providerOrderId; setState('unknown');
      }
    } catch (e) {
      if (e.response?.status === 409) {
        toast.error(e.response.data.message); setState('error');
      } else {
        pending.current = providerOrderId; setState('unknown');
      }
    }
  }, [onPaid]);

  const card = async () => {
    try {
      const { data } = await api.post('/payments/stripe/create-order', {
        courseId: course._id, couponCode: applied?.code
      });
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start card checkout');
    }
  };

  useEffect(() => {
    if (isMock) return undefined;
    let buttons; let dead = false;
    loadPayPal(course.currency).then((pp) => {
      if (dead || !box.current) return;
      buttons = pp.Buttons({
        createOrder: async () => (await api.post('/payments/paypal/create-order', {
          courseId: course._id, couponCode: applied?.code
        })).data.providerOrderId,
        onApprove: (d) => settle(d.orderID),
        onCancel: () => toast('Checkout cancelled. You have not been charged.'),
        onError: () => toast.error('PayPal had a problem. Please try again.'),
      });
      buttons.render(box.current);
    }).catch(() => setState('error'));
    return () => { dead = true; try { buttons?.close(); } catch {} };
  }, [course._id, course.currency, settle, applied, isMock]);

  if (state === 'processing') return (
    <div role="status" className="rounded-lg border p-4 text-center">
      <p className="font-semibold">{isMock ? 'Processing demo payment…' : 'Processing your payment…'}</p>
      <p className="text-sm text-slate-500">Please do not close this page.</p>
    </div>
  );

  if (state === 'unknown') return (
    <div role="alert" className="space-y-2">
      <p>We couldn't confirm your payment yet. Please check again.</p>
      <button className="btn" onClick={() => (isMock ? settleMock(pending.current) : settle(pending.current))}>
        Check payment
      </button>
    </div>
  );

  return (
    <>
      {state === 'error' && <p role="alert" className="text-red-600">Checkout unavailable. Please try again.</p>}
      <div className="mb-3 flex gap-2">
        <input aria-label="Coupon code" className="input" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="button" className="btn" onClick={apply} disabled={!code}>Apply</button>
      </div>
      {applied && <p className="mb-2">Discount: -{money(applied.discountMinor, course.currency)} · <b>Total: {money(applied.amountMinor, course.currency)}</b></p>}

      {isMock ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <div className="flex items-center gap-2 font-semibold">🧪 Demo Payment Mode</div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            This internship demo does not charge real money.
          </p>
          <button type="button" className="btn mt-3 w-full" onClick={startMock}>
            Complete Demo Payment
          </button>
        </div>
      ) : (
        <>
          <div ref={box} />
          {import.meta.env.VITE_STRIPE_ENABLED === 'true' && (
            <button type="button" className="btn mt-3 w-full" onClick={card}>Pay with Card</button>
          )}
        </>
      )}
    </>
  );
}
function Success({ title, onContinue }) {
  return (<motion.div role="status" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
    className="rounded-xl border border-green-300 bg-green-50 p-5 text-center dark:border-green-700 dark:bg-green-950">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="inline-block">
      <CheckCircle2 className="h-12 w-12 text-green-600" /></motion.div>
    <h2 className="mt-2 text-xl font-bold">Payment Successful</h2>
    <p>You now have access to <b>{title}</b>. Your receipt is on the <Link className="underline" to="/purchases">Purchases</Link> page.</p>
    <button className="btn mt-3" onClick={onContinue}>Continue Learning</button></motion.div>);
}
export default function CourseDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [c, setC] = useState(null); const [lesson, setLesson] = useState(null); const [paid, setPaid] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, completed: [] });
  const [savingLesson, setSavingLesson] = useState(false);
  const load = useCallback(() => api.get(`/courses/${id}`).then((r) => setC(r.data)).catch(() => setC(false)), [id]);
  useEffect(() => { load(); }, [load, user]);
  const canTrack = user?.role === 'Student' && c?.owned;
  useEffect(() => {
    if (!canTrack) return undefined;
    let active = true;
    api.get(`/courses/${id}/progress`).then(({ data }) => { if (active) setProgress(data); }).catch(() => {});
    return () => { active = false; };
  }, [id, canTrack]);
  const [sp, setSp] = useSearchParams();
  useEffect(() => { // returning from Stripe Checkout: confirm server-side, never trust the redirect itself
    const sid = sp.get('stripe_session');
    if (!sid || !user) return;
    setSp({}, { replace: true });
    api.post('/payments/stripe/confirm', { providerOrderId: sid })
      .then((r) => { if (r.data.status === 'COMPLETED') { setPaid(true); load(); } else toast('Payment is still being processed. Please check again shortly.'); })
      .catch(() => toast.error('Could not confirm payment yet. You may not have been charged. Please refresh in a moment.'));
  }, [sp, user]); // eslint-disable-line
  if (c === false) return <p>Course not found.</p>;
  if (!c) return <p>Loading…</p>;
  const open = async (lid) => {
    try { setLesson((await api.get(`/courses/${id}/lessons/${lid}`)).data); } catch { toast.error('Cannot open lesson'); }
  };
  const markComplete = async (lessonId) => {
    setSavingLesson(true);
    try {
      const { data } = await api.post(`/courses/${id}/lessons/${lessonId}/complete`);
      setProgress((current) => ({ progress: data.progress, completed: current.completed.includes(lessonId) ? current.completed : [...current.completed, lessonId] }));
      toast.success('Lesson marked complete');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not save lesson progress'); }
    finally { setSavingLesson(false); }
  };
  const completed = new Set(progress.completed);
  return (<div className="mx-auto max-w-5xl space-y-6">
    <header className="grid overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="p-5 md:p-8"><Link to="/" className="text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300">← Course catalog</Link>
        <div className="mt-5 flex flex-wrap items-center gap-2"><Badge tone={c.isPremium ? 'indigo' : 'green'}>{c.isPremium ? 'Premium' : 'Free'}</Badge>
          <span className="text-sm text-slate-500">{c.category} · {c.level} · {c.lessonCount} lessons</span></div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{c.title}</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">{c.description || 'A guided course to help you build practical skills, one lesson at a time.'}</p>
      </div>
      <Thumb title={c.title} thumbnail={c.thumbnail} className="h-36 md:h-full" />
    </header>

    {paid && c.owned && <Success title={c.title} onContinue={() => setPaid(false)} />}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="card space-y-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">COURSE CONTENT</p>
          <h2 className="mt-1 text-xl font-bold">Curriculum</h2></div><span className="text-sm text-slate-500">{c.lessonCount} lessons</span></div>
        {canTrack && <div className="rounded-lg bg-teal-50 p-4 dark:bg-teal-950/40">
          <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Your progress</span><span>{progress.progress}%</span></div>
          <div role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress.progress} className="h-2 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900">
            <div className="h-full rounded-full bg-teal-700 transition-[width]" style={{ width: `${progress.progress}%` }} /></div>
        </div>}
        {c.owned ? <ol className="divide-y divide-slate-200 dark:divide-slate-800">{c.lessons?.map((l, index) => {
          const isComplete = completed.has(String(l._id));
          const isActive = lesson?._id === String(l._id);
          return <li key={l._id} className="flex items-center gap-3 py-3">
            {isComplete ? <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-700" /> : <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-500 dark:border-slate-600">{index + 1}</span>}
            <button aria-current={isActive ? 'true' : undefined} className={`min-w-0 flex-1 text-left font-medium ${isActive ? 'text-teal-800 dark:text-teal-300' : 'hover:text-teal-800 dark:hover:text-teal-300'}`} onClick={() => open(l._id)}>{l.title}</button>
            {isActive && <Play aria-label="Now playing" className="h-4 w-4 shrink-0 text-teal-700" />}
          </li>;
        })}</ol> : <ol className="space-y-2">{c.lessonTitles?.map((title, index) => <li key={title} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"><span className="text-teal-700">{String(index + 1).padStart(2, '0')}</span>{title}</li>)}</ol>}
        {lesson && <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{lesson.title}</h3>
            {canTrack && (completed.has(String(lesson._id))
              ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"><CheckCircle2 className="h-4 w-4" /> Completed</span>
              : <button className="btn" disabled={savingLesson} onClick={() => markComplete(lesson._id)}>{savingLesson ? 'Saving…' : 'Mark complete'} <ArrowRight className="h-4 w-4" /></button>)}</div>
          {lesson.mediaUrl ? <video key={lesson.mediaUrl} controls controlsList="nodownload" className="w-full rounded-lg bg-black" src={MEDIA_BASE + lesson.mediaUrl} /> : <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">No video is attached to this lesson yet.</p>}
        </div>}
      </section>

      <aside className="card space-y-4 lg:sticky lg:top-24">
        {c.owned ? <>
          <div><p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">YOUR ACCESS</p><h2 className="mt-1 text-xl font-bold">{c.isPremium ? 'Course unlocked' : 'Start learning free'}</h2></div>
          {c.isPremium && <p className="flex items-center gap-2 text-sm text-teal-800 dark:text-teal-300"><CheckCircle2 className="h-5 w-5" /> Purchased and ready</p>}
          {c.lessons?.length > 0 && <button className="btn w-full" onClick={() => open((c.lessons.find((l) => !completed.has(String(l._id))) || c.lessons[0])._id)}><Play className="h-4 w-4" /> {progress.progress ? 'Continue learning' : 'Start first lesson'}</button>}
          <p className="text-sm text-slate-500">Your lesson progress is saved to your learning dashboard.</p>
        </> : <>
          <div><p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">ENROLLMENT</p><h2 className="mt-1 text-xl font-bold">Unlock the full course</h2></div>
          <p className="text-3xl font-extrabold">{money(c.priceMinor, c.currency)}</p>
          <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" /> Access unlocks after verified payment</p>
          {user ? <Checkout course={c} onPaid={() => { setPaid(true); load(); }} /> : <Link className="btn w-full" to="/login"><Lock className="h-4 w-4" /> Log in to enroll</Link>}
        </>}
      </aside>
    </div>
  </div>);
}
