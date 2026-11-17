import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Empty, Spinner } from '../components/ui';
import api from '../api/client';
import { fmtDate, fmtTime } from '../utils/format';

export default function TicketView() {
  const { bookingId } = useParams(); const [t, setT] = useState(null); const [err, setErr] = useState(false);
  useEffect(() => { api.get(`/tickets/booking/${bookingId}`).then((r) => setT(r.data.ticket)).catch(() => setErr(true)); }, [bookingId]);
  if (err) return <div className="wrap py-24"><Empty title="Ticket not found" hint="Tickets appear here once payment is complete." action={{ to: '/my-bookings', label: 'My bookings' }} /></div>;
  if (!t) return <Spinner />;
  const dead = t.verification_status !== 'valid';
  return (
    <div className="wrap max-w-md py-10">
      <div className="no-print mb-4 flex items-center justify-between"><Link to="/my-bookings" className="text-sm font-bold text-accent">All bookings</Link><button onClick={() => window.print()} className="btn-ghost !py-1.5">Print / Save PDF</button></div>
      <div className="stub card overflow-visible shadow-xl" style={{ '--notch': '62%' }}>
        <div className="rounded-t-2xl bg-gradient-to-br from-[#2A1B6B] to-accent p-6 text-white">
          <p className="text-sm text-white/70">Admit {t.items.reduce((a, i) => a + i.quantity, 0)}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{t.title}</h1>
          <p className="mt-2 text-sm text-white/85">{fmtDate(t.event_date)} · {fmtTime(t.event_time)}</p>
          <p className="text-sm text-white/85">{t.venue_name}, {t.city}</p>
        </div>
        <div className="border-t border-dashed border-line" />
        <div className="p-6 text-center">
          <div className="relative mx-auto w-fit rounded-xl bg-white p-2">
            <img src={t.qr} alt={`QR code for booking ${t.booking_code}`} className={`h-56 w-56 ${dead ? 'opacity-20' : ''}`} />
            {dead && <span className="absolute inset-0 grid place-items-center"><Badge status={t.verification_status} /></span>}
          </div>
          <p className="mt-4 font-mono text-lg font-bold tracking-wider">{t.booking_code}</p>
          <p className="text-sm text-muted">{dead ? (t.verification_status === 'used' ? 'This ticket has been scanned at entry.' : 'This ticket was cancelled.') : 'Show this code at the entrance'}</p>
          <ul className="mt-5 space-y-1 border-t border-line pt-4 text-left text-sm">
            <li className="flex justify-between"><span className="text-muted">Name</span><b>{t.holder}</b></li>
            {t.items.map((i, k) => <li key={k} className="flex justify-between"><span className="text-muted">{i.seat ? 'Seat' : 'Type'}</span><b>{i.seat ? `${i.seat} · ${i.name}` : `${i.quantity} × ${i.name}`}</b></li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
