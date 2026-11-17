import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, BarChart, Empty, Spinner, StatCard } from '../components/ui';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, inr } from '../utils/format';

export default function OrganizerDashboard() {
  const toast = useToast(); const [stats, setStats] = useState(null); const [events, setEvents] = useState(null);
  const load = () => Promise.all([api.get('/organizer/stats'), api.get('/events/mine')]).then(([s, e]) => { setStats(s.data); setEvents(e.data.events); }).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, []);
  const remove = async (e) => {
    if (!window.confirm(`Remove “${e.title}”? Events with bookings are cancelled and buyers are refunded.`)) return;
    try { const { data } = await api.delete(`/events/${e.id}`); toast(data.message); load(); } catch (er) { toast(errMsg(er), 'error'); }
  };
  if (!stats || !events) return <Spinner />;
  return (
    <div className="wrap py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-extrabold">Organizer dashboard</h1><p className="text-muted">Track sales and manage your events.</p></div>
        <div className="flex gap-2"><Link to="/organizer/bookings" className="btn-ghost">Bookings & check-in</Link><Link to="/organizer/events/new" className="btn-primary">Create event</Link></div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={inr(stats.revenue)} /><StatCard label="Tickets sold" value={stats.tickets} />
        <StatCard label="Confirmed bookings" value={stats.bookings} /><StatCard label="Events" value={stats.events} />
      </div>
      <div className="card mt-6 p-6"><h2 className="mb-4 text-lg font-bold">Revenue, last 14 days</h2><BarChart data={stats.daily} /></div>
      <h2 className="mb-4 mt-10 text-2xl font-extrabold">Your events</h2>
      {!events.length ? <Empty title="No events yet" hint="Create your first event and submit it for approval." action={{ to: '/organizer/events/new', label: 'Create event' }} /> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr>{['Event', 'Date', 'Status', 'Sold', 'Revenue', ''].map((h) => <th key={h} className="p-4 font-medium">{h}</th>)}</tr></thead>
          <tbody>{events.map((e) => {
            const pe = stats.perEvent.find((x) => x.id === e.id);
            return (<tr key={e.id} className="border-b border-line last:border-0">
              <td className="p-4 font-bold"><Link to={`/events/${e.id}`} className="hover:text-accent">{e.title}</Link><p className="text-xs font-normal text-muted">{e.city}</p></td>
              <td className="p-4">{fmtDate(e.event_date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td className="p-4"><Badge status={e.status} /></td>
              <td className="p-4">{pe ? `${pe.sold}/${pe.capacity}` : '—'}</td><td className="p-4">{inr(e.revenue)}</td>
              <td className="space-x-2 p-4 text-right"><Link to={`/organizer/events/${e.id}/edit`} className="font-bold text-accent">Edit</Link><button onClick={() => remove(e)} className="font-bold text-red-500">Remove</button></td>
            </tr>);
          })}</tbody></table></div>)}
    </div>
  );
}
