import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Empty, Spinner, Tabs } from '../components/ui';
import Poster from '../components/Poster';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, fmtTime, inr, isPast } from '../utils/format';

export default function MyBookings() {
  const toast = useToast();
  const [list, setList] = useState(null); const [tab, setTab] = useState('upcoming');
  const load = () => api.get('/bookings').then((r) => setList(r.data.bookings)).catch((e) => { toast(errMsg(e), 'error'); setList([]); });
  useEffect(() => { load(); }, []);
  const cancel = async (b) => {
    if (!window.confirm(`Cancel booking ${b.booking_code}? ${b.status === 'confirmed' ? 'Your refund goes to the original payment method.' : ''}`)) return;
    try { const { data } = await api.post(`/bookings/${b.id}/cancel`); toast(data.message); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };
  if (!list) return <Spinner />;
  const past = (b) => isPast(b.event_date, b.event_time);
  const filtered = list.filter((b) => tab === 'cancelled' ? b.status === 'cancelled' : tab === 'past' ? b.status === 'confirmed' && past(b) : b.status !== 'cancelled' && !(b.status === 'confirmed' && past(b)));

  return (
    <div className="wrap max-w-4xl py-10">
      <h1 className="text-4xl font-extrabold">My bookings</h1>
      <div className="mt-5"><Tabs value={tab} onChange={setTab} tabs={[['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']]} /></div>
      <div className="mt-6 space-y-4">
        {!filtered.length ? <Empty title={`No ${tab} bookings`} hint={tab === 'upcoming' ? 'Find your next event and book in a minute.' : undefined} action={tab === 'upcoming' ? { to: '/events', label: 'Explore events' } : undefined} />
          : filtered.map((b) => (
            <article key={b.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <Poster event={{ ...b, category_icon: '' }} className="h-28 w-full shrink-0 rounded-xl text-[0px] sm:w-36" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{b.title}</h2><Badge status={b.status} /></div>
                <p className="mt-1 text-sm text-muted">{fmtDate(b.event_date)} · {fmtTime(b.event_time)} · {b.venue_name}, {b.city}</p>
                <p className="mt-1 text-sm">{b.items.map((i) => (i.seat ? `Seat ${i.seat}` : `${i.quantity} × ${i.name}`)).join(', ')} · <b>{inr(b.total_amount)}</b> · <span className="text-muted">{b.booking_code}</span></p>
                {b.payment_status === 'refund_pending' && <p className="mt-1 text-xs text-amber-600">Refund in progress</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.status === 'confirmed' && <Link to={`/tickets/${b.id}`} className="btn-primary !py-2">View ticket</Link>}
                  {b.status === 'pending' && <Link to={`/checkout/${b.id}`} className="btn-primary !py-2">Complete payment</Link>}
                  {(b.can_cancel || b.status === 'pending') && <button onClick={() => cancel(b)} className="btn-danger !py-2">Cancel</button>}
                </div>
              </div>
            </article>))}
      </div>
    </div>
  );
}
