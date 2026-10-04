import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { clearSession, getCachedUser, getToken, setSession, setUnauthorizedHandler } from './api';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedUser());
  const [ready, setReady] = useState(false);

  // Revalidate the cached user against the server once on boot, so a stale or invalid token
  // never leaves the UI showing a signed-in shell that 401s on every subsequent request.
  useEffect(() => {
    if (!getToken()) { setUser(null); setReady(true); return; }
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => {}).finally(() => setReady(true));
  }, []);

  // Keep React state in sync when the API layer detects an expired token.
  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setReady(true); });
    return () => setUnauthorizedHandler(null);
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const { data } = await api.post(path, body);
    setSession(data.token, data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((u) => (u ? { ...u, ...patch } : u));
    const merged = { ...(getCachedUser() || {}), ...patch };
    if (getToken()) setSession(getToken(), merged);
  }, []);

  return <Ctx.Provider value={{ user, ready, authenticate, logout, updateUser }}>{children}</Ctx.Provider>;
}
