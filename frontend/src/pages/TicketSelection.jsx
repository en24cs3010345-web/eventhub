import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SeatMap from '../components/SeatMap';
import { Spinner } from '../components/ui';
import api, { fetchEvent } from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, fmtTime, inr } from '../utils/format';

const MAX = 10;
export default function TicketSelection() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast();
  const [ev, setEv] = useState(null); const [qty, setQty] = useState({}); const [seatIds, setSeatIds] = useState([]); const [busy, setBusy] = useState(false);
  useEffect(() => { fetchEvent(id).then((r) => setEv(r.event)).catch(() => nav('/events', { replace: true })); }, [id]);
  if (!ev) return <Spinner />;

  const types = ev.ticket_types;
  const seatPrice = (sid) => Number(types.find((t) => t.id === ev.seats.find((s) => s.id === sid).ticket_type_id).price);
  const count = ev.is_seated ? seatIds.length : Object.values(qty).reduce((a, b) => a + b, 0);
  const total = ev.is_seated ? seatIds.reduce((a, s) => a + seatPrice(s), 0) : types.reduce((a, t) => a + (qty[t.id] || 0) * Number(t.price), 0);
  const step = (t, d) => { const n = Math.max(0, Math.min(Number(t.available), (qty[t.id] || 0) + d)); if (d > 0 && count >= MAX) return toast(`You can book up to ${MAX} tickets at a time`, 'error'); setQty({ ...qty, [t.id]: n }); };
  const toggleSeat = (sid) => setSeatIds((s) => s.includes(sid) ? s.filter((x) => x !== sid) : s.length >= MAX ? (toast(`You can book up to ${MAX} seats at a time`, 'error'), s) : [...s, sid]);

  const proceed = async () => {
    setBusy(true);
    try {
      const body = ev.is_seated ? { event_id: ev.id, seat_ids: seatIds }
        : { event_id: ev.id, items: Object.entries(qty).filter(([, q]) => q > 0).map(([ticket_type_id, quantity]) => ({ ticket_type_id: Number(ticket_type_id), quantity })) };
      const { data } = await api.post('/bookings', body);
      nav(`/checkout/${data.booking.id}`);
    } catch (e) { toast(errMsg(e), 'error'); if (e.response?.status === 409) fetchEvent(id).then((r) => { setEv(r.event); setSeatIds([]); setQty({}); }); }
    finally { setBusy(false); }
  };

  return (
    <div className="wrap grid gap-8 py-10 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="text-3xl font-extrabold">{ev.is_seated ? 'Choose your seats' : 'Select tickets'}</h1>
        <p className="mt-1 text-muted">{ev.title} · {fmtDate(ev.event_date)} · {fmtTime(ev.event_time)} · {ev.venue_name}, {ev.city}</p>
        {ev.is_seated ? <div className="card mt-6 p-6"><SeatMap seats={ev.seats} types={types} selected={seatIds} onToggle={toggleSeat} /></div> : (
          <ul className="mt-6 space-y-3">
            {types.map((t) => (
              <li key={t.id} className="card flex items-center justify-between gap-4 p-5">
                <div><p className="text-lg font-bold">{t.name}</p><p className="text-sm text-muted">{inr(t.price)} · {Number(t.available) > 0 ? `${t.available} left` : 'Sold out'}</p></div>
                <div className="flex items-center gap-3">
                  <button className="btn-ghost !px-3.5" onClick={() => step(t, -1)} disabled={!qty[t.id]} aria-label={`Remove one ${t.name}`}>−</button>
                  <span className="w-6 text-center font-bold" aria-live="polite">{qty[t.id] || 0}</span>
                  <button className="btn-ghost !px-3.5" onClick={() => step(t, 1)} disabled={Number(t.available) === 0 || (qty[t.id] || 0) >= Number(t.available)} aria-label={`Add one ${t.name}`}>+</button>
                </div>
              </li>))}
          </ul>)}
      </div>
      <aside><div className="card sticky top-24 p-5">
        <h2 className="text-lg font-extrabold">Your order</h2>
        {count === 0 ? <p className="mt-3 text-sm text-muted">{ev.is_seated ? 'Pick seats on the map.' : 'Add tickets to continue.'}</p> : (
          <ul className="mt-3 space-y-1 text-sm">
            {ev.is_seated ? seatIds.map((s) => <li key={s} className="flex justify-between"><span>Seat {ev.seats.find((x) => x.id === s).seat_number}</span><span>{inr(seatPrice(s))}</span></li>)
              : types.filter((t) => qty[t.id]).map((t) => <li key={t.id} className="flex justify-between"><span>{qty[t.id]} × {t.name}</span><span>{inr(qty[t.id] * Number(t.price))}</span></li>)}
          </ul>)}
        <div className="mt-4 flex justify-between border-t border-line pt-4 text-lg font-extrabold"><span>Total</span><span>{inr(total)}</span></div>
        <button className="btn-primary mt-4 w-full" disabled={!count || busy} onClick={proceed}>{busy ? 'Reserving…' : 'Continue to payment'}</button>
        <p className="mt-3 text-center text-xs text-muted">We hold your tickets for 10 minutes while you pay.</p>
      </div></aside>
    </div>
  );
}
