import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Poster from '../components/Poster';
import { Badge, Empty, Spinner } from '../components/ui';
import { fetchEvent } from '../api/client';
import { fmtDate, fmtTime, inr, isPast } from '../utils/format';

export default function EventDetails() {
  const { id } = useParams(); const nav = useNavigate();
  const [state, setState] = useState({ loading: true });
  useEffect(() => { setState({ loading: true }); fetchEvent(id).then((r) => setState(r)).catch(() => setState({ error: true })); }, [id]);
  if (state.loading) return <Spinner />;
  if (state.error) return <div className="wrap py-24"><Empty title="Event not found" hint="It may have ended or been removed." action={{ to: '/events', label: 'Browse events' }} /></div>;
  const e = state.event, types = e.ticket_types || [];
  const left = types.reduce((a, t) => a + Number(t.available), 0);
  const over = isPast(e.event_date, e.event_time);
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue_name}, ${e.city}`)}`;

  return (
    <div>
      <div className="relative">
        <Poster event={e} big className="h-64 w-full sm:h-80 lg:h-96" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
      </div>
      <div className="wrap -mt-24 grid gap-8 pb-4 lg:grid-cols-[1fr_22rem]">
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2"><span className="chip">{e.category_icon} {e.category}</span>{e.status && e.status !== 'approved' && <Badge status={e.status} />}</div>
          <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{e.title}</h1>
          {state.offline && <p className="mt-3 rounded-xl bg-brand/20 p-3 text-sm">Sample event — start the backend to enable booking.</p>}
          <dl className="card mt-6 grid gap-4 p-5 sm:grid-cols-3">
            <div><dt className="text-xs text-muted">When</dt><dd className="font-bold">{fmtDate(e.event_date)}</dd><dd className="text-sm text-muted">{fmtTime(e.event_time)} onwards</dd></div>
            <div><dt className="text-xs text-muted">Where</dt><dd className="font-bold">{e.venue_name}</dd><dd className="text-sm text-muted">{e.city}{e.state ? `, ${e.state}` : ''}</dd></div>
            <div><dt className="text-xs text-muted">Hosted by</dt><dd className="font-bold">{e.organizer_name}</dd><a href={map} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent">Open in Maps</a></div>
          </dl>
          <h2 className="mt-10 text-2xl font-extrabold">About this event</h2>
          <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-muted">{e.description}</p>
          {e.address && <p className="mt-6 text-sm text-muted"><b className="text-ink">Venue address:</b> {e.address}</p>}
        </div>

        <aside className="lg:pt-28">
          <div className="card sticky top-24 p-5">
            <h2 className="text-lg font-extrabold">Tickets</h2>
            <ul className="mt-3 divide-y divide-line">
              {types.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div><p className="font-bold">{t.name}</p><p className="text-xs text-muted">{Number(t.available) > 0 ? `${t.available} available` : 'Sold out'}</p></div>
                  <p className="font-bold">{inr(t.price)}</p>
                </li>))}
            </ul>
            <button className="btn-primary mt-4 w-full" disabled={state.offline || over || left === 0 || e.status !== 'approved'} onClick={() => nav(`/events/${e.id}/tickets`)}>
              {over ? 'Event has ended' : left === 0 ? 'Sold out' : e.is_seated ? 'Choose seats' : 'Select tickets'}
            </button>
            <p className="mt-3 text-center text-xs text-muted">Free cancellation up to 24 hours before the event.</p>
          </div>
          <Link to="/events" className="mt-4 block text-center text-sm font-bold text-accent">Back to all events</Link>
        </aside>
      </div>
    </div>
  );
}
