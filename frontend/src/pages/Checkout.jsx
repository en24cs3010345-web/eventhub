import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner } from '../components/ui';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fmtDate, fmtTime, inr } from '../utils/format';

const loadRazorpay = () => new Promise((res, rej) => {
  if (window.Razorpay) return res();
  const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = res; s.onerror = () => rej(new Error('Could not load Razorpay. Check your connection.')); document.body.appendChild(s);
});

export default function Checkout() {
  const { bookingId } = useParams(); const nav = useNavigate(); const toast = useToast(); const { user } = useAuth();
  const [b, setB] = useState(null); const [left, setLeft] = useState(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then(({ data }) => {
      if (data.booking.status === 'confirmed') return nav(`/tickets/${bookingId}`, { replace: true });
      if (data.booking.status !== 'pending') { toast('This booking expired. Please select tickets again.', 'error'); return nav(`/events/${data.booking.event_id}`, { replace: true }); }
      setB(data.booking);
    }).catch((e) => { toast(errMsg(e), 'error'); nav('/my-bookings', { replace: true }); });
  }, [bookingId]);

  useEffect(() => {
    if (!b?.expires_at) return;
    const t = setInterval(() => {
      const s = Math.floor((new Date(b.expires_at) - Date.now()) / 1000);
      setLeft(Math.max(0, s));
      if (s <= 0) { clearInterval(t); toast('Time’s up — your tickets were released.', 'error'); nav(`/events/${b.event_id}`, { replace: true }); }
    }, 1000);
    return () => clearInterval(t);
  }, [b]);

  const verify = async (payload) => {
    await api.post('/payments/verify', { booking_id: Number(bookingId), ...payload });
    toast('Payment successful! Your ticket is ready.'); nav(`/tickets/${bookingId}`, { replace: true });
  };
  const pay = async () => {
    setBusy(true);
    try {
      const { data: o } = await api.post('/payments/order', { booking_id: Number(bookingId) });
      if (o.free || o.already_paid) { toast('Booking confirmed!'); return nav(`/tickets/${bookingId}`, { replace: true }); }
      if (o.demo) return await verify({ razorpay_order_id: o.order_id, razorpay_payment_id: `pay_demo_${Date.now()}`, razorpay_signature: 'demo' });
      await loadRazorpay();
      new window.Razorpay({
        key: o.key_id, amount: o.amount, currency: o.currency, order_id: o.order_id, name: 'EventHub', description: b.title,
        prefill: { name: user.name, email: user.email, contact: user.phone || '' }, theme: { color: '#E0306E' },
        handler: (r) => verify(r).catch((e) => toast(errMsg(e), 'error')),
        modal: { ondismiss: () => setBusy(false) },
      }).open();
      return;
    } catch (e) { toast(errMsg(e), 'error'); }
    setBusy(false);
  };
  const cancel = async () => { try { await api.post(`/bookings/${bookingId}/cancel`); nav(`/events/${b.event_id}`); } catch (e) { toast(errMsg(e), 'error'); } };

  if (!b) return <Spinner />;
  const mm = left === null ? '--' : String(Math.floor(left / 60)).padStart(2, '0'), ss = left === null ? '--' : String(left % 60).padStart(2, '0');
  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">Checkout</h1>
      <div className={`mt-4 rounded-xl p-3 text-sm font-medium ${left !== null && left < 60 ? 'bg-red-500/15 text-red-500' : 'bg-brand/20'}`} role="timer">Tickets held for you: <b>{mm}:{ss}</b></div>
      <div className="card mt-6 p-6">
        <h2 className="text-xl font-bold">{b.title}</h2>
        <p className="text-sm text-muted">{fmtDate(b.event_date)} · {fmtTime(b.event_time)} · {b.venue_name}, {b.city}</p>
        <ul className="mt-5 divide-y divide-line text-sm">
          {b.items.map((i, k) => <li key={k} className="flex justify-between py-2"><span>{i.seat ? `Seat ${i.seat} · ` : `${i.quantity} × `}{i.name}</span><span>{inr(i.price * i.quantity)}</span></li>)}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-4 text-xl font-extrabold"><span>Total</span><span>{inr(b.total_amount)}</span></div>
        <p className="mt-1 text-xs text-muted">Booking code {b.booking_code} · Pay with UPI, cards or netbanking via Razorpay</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="btn-primary flex-1 !py-3.5 text-base" onClick={pay} disabled={busy}>{busy ? 'Processing…' : Number(b.total_amount) === 0 ? 'Confirm free booking' : `Pay ${inr(b.total_amount)}`}</button>
        <button className="btn-ghost" onClick={cancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
