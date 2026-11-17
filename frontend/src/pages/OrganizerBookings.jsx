import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, BarChart, Empty, Spinner, StatCard } from '../components/ui';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, inr } from '../utils/format';

export default function OrganizerBookings() {
  const toast = useToast(); const [stats, setStats] = useState(null); const [rows, setRows] = useState(null);
  const [code, setCode] = useState(''); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => Promise.all([api.get('/organizer/stats'), api.get('/organizer/bookings')]).then(([s, b]) => { setStats(s.data); setRows(b.data.bookings); }).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, []);
  const verify = async (e) => {
    e.preventDefault(); if (!code.trim()) return; setBusy(true); setResult(null);
    try { const { data } = await api.post('/tickets/verify', { code }); setResult({ ok: true, ...data }); setCode(''); load(); }
    catch (er) { setResult({ ok: false, message: errMsg(er), ...(er.response?.data || {}) }); } finally { setBusy(false); }
  };
  if (!stats || !rows) return <Spinner />;
  return (
    <div className="wrap py-10">
      <Link to="/organizer" className="text-sm font-bold text-accent">Back to dashboard</Link>
      <h1 className="mt-2 text-4xl font-extrabold">Bookings, revenue & check-in</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Revenue" value={inr(stats.revenue)} /><StatCard label="Tickets sold" value={stats.tickets} /><StatCard label="Bookings" value={stats.bookings} /></div>
          <div className="card p-6"><h2 className="mb-4 text-lg font-bold">Revenue by day</h2><BarChart data={stats.daily} /></div>
          <div className="card overflow-x-auto p-2"><table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-muted"><tr>{['Event', 'Sold', 'Capacity', 'Revenue'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>{stats.perEvent.map((e) => <tr key={e.id} className="border-t border-line"><td className="p-3 font-bold">{e.title}</td><td className="p-3">{e.sold}</td><td className="p-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-line"><div className="h-full bg-teal" style={{ width: `${e.capacity ? (e.sold / e.capacity) * 100 : 0}%` }} /></div></td><td className="p-3">{inr(e.revenue)}</td></tr>)}</tbody></table></div>
        </div>
        <aside><div className="card sticky top-24 p-5">
          <h2 className="text-lg font-bold">Verify ticket</h2><p className="mt-1 text-sm text-muted">Enter the code under the guest’s QR (or the booking code). A valid ticket is marked as used.</p>
          <form onSubmit={verify} className="mt-4 flex gap-2"><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="EVT-XXXXXXXX" aria-label="Ticket code" /><button className="btn-primary" disabled={busy}>Verify</button></form>
          {result && (
            <div className={`mt-4 rounded-xl p-4 text-sm ${result.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`} role="alert">
              <p className="font-bold">{result.message}</p>
              {result.holder && <p className="mt-1">{result.holder} · {result.tickets} ticket{result.tickets > 1 ? 's' : ''}{result.seats ? ` · ${result.seats}` : ''}<br />{result.event}</p>}
            </div>)}
        </div></aside>
      </div>
      <h2 className="mb-4 mt-10 text-2xl font-extrabold">Recent bookings</h2>
      {!rows.length ? <Empty title="No bookings yet" hint="Confirmed bookings for your events appear here." /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr>{['Code', 'Customer', 'Event', 'Tickets', 'Amount', 'Date', 'Status', 'Entry'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rows.map((b) => <tr key={b.id} className="border-b border-line last:border-0"><td className="p-3 font-mono">{b.booking_code}</td><td className="p-3">{b.customer}<p className="text-xs text-muted">{b.email}</p></td><td className="p-3">{b.title}</td><td className="p-3">{b.tickets}</td><td className="p-3">{inr(b.total_amount)}</td><td className="p-3">{fmtDate(b.created_at, { day: 'numeric', month: 'short' })}</td><td className="p-3"><Badge status={b.status} /></td><td className="p-3">{b.verification_status && <Badge status={b.verification_status} />}</td></tr>)}</tbody></table></div>)}
    </div>
  );
}
