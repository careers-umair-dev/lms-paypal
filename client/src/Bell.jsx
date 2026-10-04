import { useEffect, useState } from 'react';
import { Bell as B } from 'lucide-react';
import api from './api';
export default function Bell() {
  const [d, setD] = useState({ items: [], unread: 0 }); const [open, setOpen] = useState(false);
  const load = () => api.get('/notifications').then((r) => setD(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  const toggle = () => { setOpen(!open); if (!open && d.unread) api.post('/notifications/read').then(() => setD({ ...d, unread: 0 })); };
  return (<div className="relative">
    <button onClick={toggle} aria-label={`Notifications, ${d.unread} unread`} className="relative rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-700">
      <B className="h-5 w-5" />{d.unread > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1 text-xs text-white">{d.unread}</span>}</button>
    {open && <div className="card absolute right-0 z-10 mt-2 w-72 space-y-2 text-sm">{d.items.length ? d.items.map((n) => <p key={n._id}>{n.message}</p>) : <p>No notifications.</p>}</div>}
  </div>);
}
