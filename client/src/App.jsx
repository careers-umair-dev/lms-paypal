import { lazy, Suspense, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Skeleton } from './ui';
import Bell from './Bell';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Auth from './pages/Auth';

// Route-level code splitting: account pages and the admin bundle (recharts) are only
// downloaded once the visitor actually opens them.
const MyCourses = lazy(() => import('./pages/MyCourses'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));

const PageLoader = () => (
  <div className="space-y-4" role="status" aria-label="Loading page">
    <Skeleton className="h-9 w-64" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
  </div>
);
const Guard = ({ children, roles }) => {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};
const PublicOnly = ({ children }) => {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  return user ? <Navigate to="/my-courses" replace /> : children;
};
function toggleDark() {
  const on = document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark', on ? '1' : '0');
}
const linkCls = ({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-900 dark:from-teal-950 dark:to-cyan-950 dark:text-teal-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`;

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const staff = user && ['Admin', 'Instructor'].includes(user.role);
  const links = [
    ...(user ? [['/my-courses', 'My Courses'], ['/purchases', 'Purchases'], ['/profile', 'Profile']] : []),
    ...(staff ? [['/admin', 'Admin']] : []),
  ];
  return (<>
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-2 flex items-center gap-2 font-extrabold tracking-tight text-teal-800 dark:text-teal-300"><GraduationCap className="h-6 w-6" /> Premium LMS</Link>
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={linkCls}>Courses</NavLink>
          {links.map(([to, label]) => <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>)}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {user && <Bell />}
          <button onClick={toggleDark} aria-label="Toggle dark mode" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" /></button>
          {user ? (<div className="hidden items-center gap-2 md:flex">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            <button onClick={logout} className="text-sm font-medium underline-offset-2 hover:underline">Logout</button></div>)
            : <Link to="/login" className="btn hidden md:inline-flex">Login</Link>}
          <button className="rounded-lg p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </nav>
      <AnimatePresence>{open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 md:hidden dark:border-slate-700">
        <div className="flex flex-col gap-1 p-3" onClick={() => setOpen(false)}>
          <NavLink to="/" end className={linkCls}>Courses</NavLink>
          {links.map(([to, label]) => <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>)}
          {user ? <button onClick={logout} className="rounded-lg px-3 py-1.5 text-left text-sm font-medium">Logout ({user.name})</button> : <Link to="/login" className="btn">Login</Link>}
        </div></motion.div>)}</AnimatePresence>
    </header>
    <main id="main" className="mx-auto max-w-6xl p-4 md:p-6">
      <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/login" element={<PublicOnly><Auth /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Auth /></PublicOnly>} />
            <Route path="/my-courses" element={<Guard><MyCourses /></Guard>} />
            <Route path="/purchases" element={<Guard><Purchases /></Guard>} />
            <Route path="/profile" element={<Guard><Profile /></Guard>} />
            <Route path="/admin" element={<Guard roles={['Admin', 'Instructor']}><Admin /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </main>
    <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
      Premium LMS · Payments are simulated unless a provider is configured.
    </footer>
  </>);
}

function NotFound() {
  return (<div className="card mx-auto max-w-md space-y-3 py-12 text-center">
    <p className="text-6xl font-black text-teal-700">404</p>
    <h1 className="text-xl font-bold">Page not found</h1>
    <p className="text-sm text-slate-500">The page you are looking for does not exist or has moved.</p>
    <Link to="/" className="btn">Back to courses</Link>
  </div>);
}
