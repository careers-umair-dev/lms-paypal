import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import '@fontsource-variable/inter';
import { AuthProvider } from './AuthContext';
import ErrorBoundary from './ErrorBoundary';
import App from './App';
import './index.css';
const saved = localStorage.getItem('dark'); // first visit follows the OS theme
if (saved === '1' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
document.title = 'Premium LMS';
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MotionConfig reducedMotion="user"><AuthProvider><App />
      <Toaster position="top-right" toastOptions={{ className: 'dark:!bg-slate-800 dark:!text-slate-100', style: { borderRadius: '12px' } }} />
    </AuthProvider></MotionConfig></BrowserRouter>
  </ErrorBoundary>);
