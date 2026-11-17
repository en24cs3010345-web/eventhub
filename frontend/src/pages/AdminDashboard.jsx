import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, BarChart, Spinner, StatCard, Tabs } from '../components/ui';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, inr } from '../utils/format';

const Table = ({ heads, children }) => (
  <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-line text-muted"><tr>{heads.map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
);
const td = 'p-3 border-b border-line';

export default function AdminDashboard() {
  const toast = useToast(); const [tab, setTab] = useState('overview'); const [d, setD] = useState({}); const [filter, setFilter] = useState('pending');
  const [cat, setCat] = useState({ name: '', icon: '' });
  const fail = (e) => toast(errMsg(e), 'error');
  const load = (k, url, key) => api.get(url).then((r) => setD((s) => ({ ...s, [k]: r.data[key] ?? r.data }))).catch(fail);
  const refresh = (t = tab) => {
    if (t === 'overview') load('stats', '/admin/stats');
    if (t === 'events') load('events', `/admin/events${filter ? `?status=${filter}` : ''}`, 'events');
    if (t === 'users') load('users', '/admin/users', 'users');
    if (t === 'bookings') load('bookings', '/admin/bookings', 'bookings');
    if (t === 'categories') load('cats', '/categories', 'categories');
  };
  useEffect(() => { refresh(); }, [tab, filter]);

  const act = async (fn, msg) => { try { await fn(); toast(msg); refresh(); } catch (e) { fail(e); } };
  const s = d.stats;
  return (
    <div className="wrap py-10">
      <h1 className="text-4xl font-extrabold">Admin dashboard</h1>
      <div className="mt-5"><Tabs value={tab} onChange={setTab} tabs={[['overview', 'Overview'], ['events', 'Event approvals'], ['users', 'Users'], ['bookings', 'Bookings'], ['categories', 'Categories']]} /></div>
      <div className="mt-6">
        {tab === 'overview' && (!s ? <Spinner /> : (<>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Platform revenue" value={inr(s.bookings.revenue)} hint={`${s.bookings.confirmed} confirmed bookings`} />
            <StatCard label="Users" value={s.users.total} hint={`${s.users.organizers} organizers`} />
            <StatCard label="Live events" value={s.events.approved} hint={`${s.events.total} total`} />
            <StatCard label="Awaiting approval" value={s.events.pending} hint={s.events.pending ? 'Review in Event approvals' : 'All caught up'} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card p-6"><h2 className="mb-4 text-lg font-bold">Revenue, last 14 days</h2><BarChart data={s.daily} /></div>
            <div className="card p-6"><h2 className="mb-4 text-lg font-bold">By category</h2><ul className="space-y-3 text-sm">{s.byCategory.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name} <span className="text-muted">· {c.events} events</span></span><b>{inr(c.revenue)}</b></li>)}</ul></div>
          </div></>))}

        {tab === 'events' && (<>
          <div className="mb-4 flex gap-2">{[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['', 'All']].map(([k, l]) => <button key={k} className={`chip ${filter === k ? 'chip-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
          {!d.events ? <Spinner /> : <Table heads={['Event', 'Organizer', 'Date', 'Status', 'Actions']}>
            {d.events.map((e) => <tr key={e.id}>
              <td className={td}><Link to={`/events/${e.id}`} className="font-bold hover:text-accent">{e.title}</Link><p className="text-xs text-muted">{e.category} · {e.city}</p></td>
              <td className={td}>{e.organizer}</td><td className={td}>{fmtDate(e.event_date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className={td}><Badge status={e.status} /></td>
              <td className={`${td} space-x-3`}>
                {e.status !== 'approved' && <button className="font-bold text-emerald-600" onClick={() => act(() => api.patch(`/admin/events/${e.id}`, { status: 'approved' }), 'Event approved')}>Approve</button>}
                {e.status !== 'rejected' && e.status !== 'cancelled' && <button className="font-bold text-red-500" onClick={() => act(() => api.patch(`/admin/events/${e.id}`, { status: 'rejected' }), 'Event rejected')}>Reject</button>}
                {e.status === 'approved' && <button className="font-bold text-accent" onClick={() => act(() => api.patch(`/admin/events/${e.id}`, { is_featured: !e.is_featured }), e.is_featured ? 'Removed from featured' : 'Featured on home')}>{e.is_featured ? 'Unfeature' : 'Feature'}</button>}
              </td></tr>)}
            {!d.events.length && <tr><td colSpan={5} className="p-8 text-center text-muted">Nothing here.</td></tr>}
          </Table>}</>)}

        {tab === 'users' && (!d.users ? <Spinner /> : <Table heads={['Name', 'Email', 'Role', 'Joined', 'Status', '']}>
          {d.users.map((u) => <tr key={u.id}><td className={`${td} font-bold`}>{u.name}</td><td className={td}>{u.email}</td>
            <td className={td}><select className="input !w-32 !py-1.5" value={u.role} onChange={(e) => act(() => api.patch(`/admin/users/${u.id}`, { role: e.target.value }), 'Role updated')}>{['user', 'organizer', 'admin'].map((r) => <option key={r}>{r}</option>)}</select></td>
            <td className={td}>{fmtDate(u.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className={td}><Badge status={u.is_active ? 'confirmed' : 'cancelled'} /></td>
            <td className={td}><button className={`font-bold ${u.is_active ? 'text-red-500' : 'text-emerald-600'}`} onClick={() => act(() => api.patch(`/admin/users/${u.id}`, { is_active: !u.is_active }), u.is_active ? 'User suspended' : 'User reactivated')}>{u.is_active ? 'Suspend' : 'Reactivate'}</button></td></tr>)}
        </Table>)}

        {tab === 'bookings' && (!d.bookings ? <Spinner /> : <Table heads={['Code', 'Customer', 'Event', 'Amount', 'Booking', 'Payment', 'Date']}>
          {d.bookings.map((b) => <tr key={b.id}><td className={`${td} font-mono`}>{b.booking_code}</td><td className={td}>{b.customer}</td><td className={td}>{b.title}</td><td className={td}>{inr(b.total_amount)}</td><td className={td}><Badge status={b.status} /></td><td className={td}>{b.payment_status ? <Badge status={b.payment_status === 'paid' ? 'confirmed' : b.payment_status === 'refund_pending' ? 'pending' : b.payment_status} /> : '—'}</td><td className={td}>{fmtDate(b.created_at, { day: 'numeric', month: 'short' })}</td></tr>)}
        </Table>)}

        {tab === 'categories' && (<div className="max-w-xl space-y-4">
          <form className="card flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); if (cat.name.trim().length < 2) return toast('Enter a category name', 'error'); act(async () => { await api.post('/admin/categories', cat); setCat({ name: '', icon: '' }); }, 'Category added'); }}>
            <input className="input w-20" placeholder="🎟️" maxLength={4} value={cat.icon} onChange={(e) => setCat({ ...cat, icon: e.target.value })} aria-label="Icon" />
            <input className="input" placeholder="New category name" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} aria-label="Category name" /><button className="btn-primary">Add</button></form>
          {!d.cats ? <Spinner /> : <ul className="card divide-y divide-line">{d.cats.map((c) => <li key={c.id} className="flex items-center justify-between p-4"><span className="font-bold">{c.icon} {c.name}</span>
            <span className="space-x-4 text-sm font-bold"><button className="text-accent" onClick={() => { const n = window.prompt('Rename category', c.name); if (n && n.trim().length > 1) act(() => api.put(`/admin/categories/${c.id}`, { name: n, icon: c.icon }), 'Category renamed'); }}>Rename</button>
              <button className="text-red-500" onClick={() => window.confirm(`Delete “${c.name}”?`) && act(() => api.delete(`/admin/categories/${c.id}`), 'Category deleted')}>Delete</button></span></li>)}</ul>}
        </div>)}
      </div>
    </div>
  );
}
