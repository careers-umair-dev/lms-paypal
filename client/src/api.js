import axios from 'axios';
const TOKEN_KEY = 'lms.token';
const USER_KEY = 'lms.user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); };
export const getCachedUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });
api.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
// One 401 means the JWT is expired/revoked: clear the session once and send the user to /login
// exactly once, so a burst of parallel requests cannot trigger competing redirects.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
api.interceptors.response.use((r) => r, (error) => {
  if (error.response?.status === 401 && getToken()) {
    clearSession();
    onUnauthorized?.();
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }
  return Promise.reject(error);
});
export const money = (minor, cur = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format((minor || 0) / 100);
export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || e?.message || fallback;
export const formatDate = (d) =>
  (d ? new Date(d) : null)?.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) || '-';
export default api;
