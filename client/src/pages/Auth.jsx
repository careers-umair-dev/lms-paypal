import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
export default function Auth() {
  const { authenticate } = useAuth(); const nav = useNavigate(); const location = useLocation();
  const mode = location.pathname === '/register' ? 'register' : 'login';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await authenticate(`/auth/${mode}`, f); nav('/'); }
    catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    setBusy(false);
  };
  return (<form onSubmit={submit} className="card mx-auto mt-10 max-w-sm space-y-3">
    <h1 className="text-xl font-bold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
    {mode === 'register' && <><label htmlFor="n">Name</label><input id="n" className="input" required value={f.name} onChange={set('name')} /></>}
    <label htmlFor="e">Email</label><input id="e" type="email" className="input" required value={f.email} onChange={set('email')} />
    <label htmlFor="p">Password</label><input id="p" type="password" minLength={8} className="input" required value={f.password} onChange={set('password')} />
    <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}</button>
    <button type="button" className="text-sm underline" onClick={() => nav(mode === 'login' ? '/register' : '/login')}>
      {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}</button>
  </form>);
}
