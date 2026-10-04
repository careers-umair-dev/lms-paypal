import { useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { Badge } from '../ui';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSavePassword = currentPassword.length > 0 && newPassword.length >= 8
    && passwordsMatch && newPassword !== currentPassword;

  const saveName = async (event) => {
    event.preventDefault();
    setSavingName(true);
    try {
      const { data } = await api.put('/auth/profile', { name: name.trim() });
      updateUser(data.user);
      setName(data.user.name);
      toast.success('Profile updated');
    } catch (error) { toast.error(errMsg(error, 'Could not update profile')); }
    finally { setSavingName(false); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (!canSavePassword) return;
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrent(''); setNew(''); setConfirm('');
      toast.success('Password changed successfully');
    } catch (error) { toast.error(errMsg(error, 'Could not change password')); }
    finally { setSavingPassword(false); }
  };

  return (<div className="mx-auto max-w-5xl space-y-7 md:space-y-9">
    <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
      <p className="text-xs font-bold uppercase text-teal-700 dark:text-teal-400">ACCOUNT</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Profile &amp; security</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Manage your personal details and keep your account secure.</p>
    </header>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="card space-y-5" aria-labelledby="profile-heading">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-2xl font-black text-white dark:bg-teal-700">
            {user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</span>
          <div className="min-w-0 flex-1">
            <h2 id="profile-heading" className="text-xl font-bold">Your profile</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{user?.email}</p>
          </div>
          <Badge tone="indigo">{user?.role}</Badge>
        </div>

        <dl className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          <div className="flex items-center gap-3 py-3">
            <Mail aria-hidden className="h-4 w-4 text-slate-400" />
            <dt className="min-w-24 text-sm text-slate-500">Email</dt>
            <dd className="min-w-0 break-all text-sm font-medium">{user?.email}</dd>
          </div>
          <div className="flex items-center gap-3 py-3">
            <ShieldCheck aria-hidden className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <dt className="min-w-24 text-sm text-slate-500">Access role</dt>
            <dd className="text-sm font-medium">{user?.role}</dd>
          </div>
        </dl>

        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold">Display name</label>
            <input id="profile-name" name="name" autoComplete="name" className="input" value={name}
              onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
            <p className="mt-1.5 text-xs text-slate-500">This is how your name appears across your learning space.</p>
          </div>
          <button className="btn" disabled={savingName || name.trim() === user?.name}>
            <Save aria-hidden className="h-4 w-4" /> {savingName ? 'Saving profile…' : 'Save changes'}
          </button>
        </form>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
          <UserRound aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
          Email and access role are managed by your administrator and cannot be changed here.
        </p>
      </section>

      <section className="card space-y-5" aria-labelledby="security-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="security-heading" className="flex items-center gap-2 text-xl font-bold"><KeyRound aria-hidden className="h-5 w-5 text-teal-700 dark:text-teal-400" /> Password</h2>
            <p className="mt-1 text-sm text-slate-500">Use at least 8 characters and confirm the new password.</p>
          </div>
          <button type="button" onClick={() => setShowPasswords((visible) => !visible)}
            aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} title={showPasswords ? 'Hide passwords' : 'Show passwords'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:hover:bg-slate-800">
            {showPasswords ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
          </button>
        </div>

        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-sm font-semibold">Current password</label>
            <input id="current-password" name="current-password" type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password" className="input" value={currentPassword}
              onChange={(event) => setCurrent(event.target.value)} required />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold">New password</label>
            <input id="new-password" name="new-password" type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password" className="input" value={newPassword}
              onChange={(event) => setNew(event.target.value)} required minLength={8} />
            {newPassword && <p className={`mt-1.5 text-xs ${newPassword.length >= 8 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {newPassword.length >= 8 ? 'Minimum length met.' : `${8 - newPassword.length} more characters required.`}
            </p>}
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold">Confirm new password</label>
            <input id="confirm-password" name="confirm-password" type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password" className="input" value={confirmPassword}
              onChange={(event) => setConfirm(event.target.value)} required minLength={8}
              aria-describedby={confirmPassword ? 'password-match' : undefined} />
            {confirmPassword && <p id="password-match" role={passwordsMatch ? 'status' : 'alert'}
              className={`mt-1.5 text-xs ${passwordsMatch ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600'}`}>
              {passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
            </p>}
          </div>
          {currentPassword && newPassword && currentPassword === newPassword &&
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">Choose a password different from your current one.</p>}
          <button className="btn" disabled={savingPassword || !canSavePassword}>
            <Save aria-hidden className="h-4 w-4" /> {savingPassword ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  </div>);
}
