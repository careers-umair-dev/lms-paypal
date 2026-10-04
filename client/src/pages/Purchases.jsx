import { useEffect, useState } from 'react';
import api, { money } from '../api';
async function download(o) {
  try {
    const r = await api.get(`/orders/${o._id}/invoice`, { responseType: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `invoice-${o._id}.pdf`; a.click();
  } catch { alert('Invoice unavailable'); }
}
export default function Purchases() {
  const [d, setD] = useState(null); const [page, setPage] = useState(1);
  useEffect(() => { api.get('/orders', { params: { page } }).then((r) => setD(r.data)).catch(() => setD({ items: [], pages: 1 })); }, [page]);
  if (!d) return <p>Loading…</p>;
  if (!d.items.length) return <p>No purchases yet.</p>;
  return (<div className="space-y-3">
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr><th className="p-2">Course</th><th>Date</th><th>Amount</th><th>Status</th><th>Transaction</th><th>Invoice</th></tr></thead>
      <tbody>{d.items.map((o) => (<tr key={o._id} className="border-t border-slate-200 dark:border-slate-700">
        <td className="p-2">{o.course?.title || 'Deleted course'}</td><td>{new Date(o.createdAt).toLocaleDateString()}</td>
        <td>{money(o.amountMinor, o.currency)}</td><td>{o.status}</td><td className="break-all">{o.providerTransactionId || '-'}</td><td>{o.completedAt ? <button className="underline" onClick={() => download(o)}>Download</button> : '-'}</td></tr>))}</tbody>
    </table></div>
    <div className="flex gap-2"><button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <button className="btn" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Next</button></div>
  </div>);
}
