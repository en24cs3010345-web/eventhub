import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field, Spinner } from '../components/ui';
import api, { fetchCategories } from '../api/client';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../utils/format';

const blank = { title: '', description: '', category_id: '', event_date: '', event_time: '19:00', poster_url: '', is_seated: false,
  venue: { name: '', address: '', city: '', state: '', capacity: 500 }, ticket_types: [{ name: 'General', price: 499, quantity: 100 }], seat_config: { rows: 6, cols: 10 } };

export default function EventForm() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast();
  const [f, setF] = useState(blank); const [cats, setCats] = useState([]); const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!!id); const [busy, setBusy] = useState(false); const [up, setUp] = useState(false);

  useEffect(() => { fetchCategories().then(setCats); }, []);
  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then(({ data: { event: e } }) => setF({
      title: e.title, description: e.description, category_id: e.category_id, event_date: e.event_date.slice(0, 10), event_time: e.event_time.slice(0, 5), poster_url: e.poster_url || '',
      is_seated: e.is_seated, venue: { name: e.venue_name, address: e.address, city: e.city, state: e.state || '', capacity: e.capacity },
      ticket_types: e.ticket_types.map((t) => ({ id: t.id, name: t.name, price: Number(t.price), quantity: t.quantity })), seat_config: blank.seat_config,
    })).catch(() => nav('/organizer')).finally(() => setLoading(false));
  }, [id]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setVenue = (k, v) => setF((s) => ({ ...s, venue: { ...s.venue, [k]: v } }));
  const setTT = (i, k, v) => setF((s) => ({ ...s, ticket_types: s.ticket_types.map((t, j) => (j === i ? { ...t, [k]: v } : t)) }));
  const err = (k) => errors[k];

  const validate = () => {
    const e = {};
    if (f.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (f.description.trim().length < 20) e.description = 'Describe the event in at least 20 characters';
    if (!f.category_id) e.category_id = 'Choose a category';
    if (!f.event_date) e.event_date = 'Choose a date'; else if (!id && f.event_date < new Date().toISOString().slice(0, 10)) e.event_date = 'Date cannot be in the past';
    if (!f.venue.name.trim()) e['venue.name'] = 'Venue name is required';
    if (!f.venue.address.trim()) e['venue.address'] = 'Address is required';
    if (!f.venue.city.trim()) e['venue.city'] = 'City is required';
    if (f.poster_url && !/^https?:\/\//.test(f.poster_url)) e.poster_url = 'Poster must be a valid link';
    f.ticket_types.forEach((t, i) => {
      if (!t.name.trim()) e[`ticket_types.${i}.name`] = 'Name required';
      if (t.price === '' || Number(t.price) < 0) e[`ticket_types.${i}.price`] = 'Price must be 0 or more';
      if (!f.is_seated && (!t.quantity || Number(t.quantity) < 1)) e[`ticket_types.${i}.quantity`] = 'Quantity must be at least 1';
    });
    return e;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(); setErrors(e); if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'error');
    setBusy(true);
    const body = { ...f, category_id: Number(f.category_id), venue: { ...f.venue, capacity: Number(f.venue.capacity) },
      ticket_types: f.ticket_types.map((t) => ({ ...t, price: Number(t.price), quantity: Number(t.quantity) })),
      seat_config: { rows: Number(f.seat_config.rows), cols: Number(f.seat_config.cols) } };
    try {
      const { data } = id ? await api.put(`/events/${id}`, body) : await api.post('/events', body);
      toast(data.message); nav('/organizer');
    } catch (er) { setErrors(fieldErrors(er)); toast(errMsg(er), 'error'); } finally { setBusy(false); }
  };
  const upload = async (file) => {
    if (!file) return; setUp(true);
    try { const fd = new FormData(); fd.append('poster', file); const { data } = await api.post('/events/upload-poster', fd); set('poster_url', data.url); toast('Poster uploaded'); }
    catch (er) { toast(errMsg(er), 'error'); } finally { setUp(false); }
  };
  if (loading) return <Spinner />;

  return (
    <form onSubmit={submit} className="wrap max-w-3xl space-y-6 py-10" noValidate>
      <Link to="/organizer" className="text-sm font-bold text-accent">Back to dashboard</Link>
      <h1 className="text-4xl font-extrabold">{id ? 'Edit event' : 'Create event'}</h1>
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Basics</h2>
        <Field label="Event title" error={err('title')}><input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Description" error={err('description')}><textarea rows={5} className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category" error={err('category_id')}><select className="input" value={f.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Select…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Date" error={err('event_date')}><input type="date" className="input" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>
          <Field label="Start time" error={err('event_time')}><input type="time" className="input" value={f.event_time} onChange={(e) => set('event_time', e.target.value)} /></Field>
        </div>
        <Field label="Poster" error={err('poster_url')} hint="Upload an image (needs Cloudinary) or paste a link">
          <div className="flex flex-col gap-2 sm:flex-row"><input className="input" placeholder="https://…" value={f.poster_url} onChange={(e) => set('poster_url', e.target.value)} />
            <label className="btn-ghost cursor-pointer">{up ? 'Uploading…' : 'Upload'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files[0])} /></label></div>
          {f.poster_url && <img src={f.poster_url} alt="Poster preview" className="mt-3 h-32 rounded-xl object-cover" />}
        </Field>
      </section>
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Venue</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue name" error={err('venue.name')}><input className="input" value={f.venue.name} onChange={(e) => setVenue('name', e.target.value)} /></Field>
          <Field label="City" error={err('venue.city')}><input className="input" value={f.venue.city} onChange={(e) => setVenue('city', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Address" error={err('venue.address')}><input className="input" value={f.venue.address} onChange={(e) => setVenue('address', e.target.value)} /></Field></div>
          <Field label="State"><input className="input" value={f.venue.state} onChange={(e) => setVenue('state', e.target.value)} /></Field>
          <Field label="Venue capacity" error={err('venue.capacity')}><input type="number" min="1" className="input" value={f.venue.capacity} onChange={(e) => setVenue('capacity', e.target.value)} /></Field>
        </div>
      </section>
      <section className="card space-y-4 p-6">
        <h2 className="text-lg font-bold">Tickets</h2>
        {!id && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.is_seated} onChange={(e) => set('is_seated', e.target.checked)} /> Reserved seating (guests pick seats on a map)</label>}
        {f.is_seated && !id && <div className="grid grid-cols-2 gap-4"><Field label="Rows (A–Z)" error={err('seat_config.rows')}><input type="number" min="1" max="26" className="input" value={f.seat_config.rows} onChange={(e) => set('seat_config', { ...f.seat_config, rows: e.target.value })} /></Field><Field label="Seats per row" error={err('seat_config.cols')}><input type="number" min="1" max="30" className="input" value={f.seat_config.cols} onChange={(e) => set('seat_config', { ...f.seat_config, cols: e.target.value })} /></Field><p className="col-span-2 text-xs text-muted">Rows are split evenly across the ticket types below, first type at the front.</p></div>}
        {f.ticket_types.map((t, i) => (
          <div key={i} className="grid items-start gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
            <Field label="Name" error={err(`ticket_types.${i}.name`)}><input className="input" value={t.name} onChange={(e) => setTT(i, 'name', e.target.value)} /></Field>
            <Field label="Price (₹)" error={err(`ticket_types.${i}.price`)}><input type="number" min="0" className="input" value={t.price} onChange={(e) => setTT(i, 'price', e.target.value)} /></Field>
            {!f.is_seated ? <Field label="Quantity" error={err(`ticket_types.${i}.quantity`)}><input type="number" min="1" className="input" value={t.quantity} onChange={(e) => setTT(i, 'quantity', e.target.value)} /></Field> : <div />}
            {!t.id && f.ticket_types.length > 1 ? <button type="button" className="btn-danger mt-7 !px-3" onClick={() => set('ticket_types', f.ticket_types.filter((_, j) => j !== i))} aria-label="Remove ticket type">✕</button> : <div />}
          </div>))}
        {errors.ticket_types && <p className="err">{errors.ticket_types}</p>}
        {!(id && f.is_seated) && <button type="button" className="btn-ghost" onClick={() => set('ticket_types', [...f.ticket_types, { name: '', price: 0, quantity: 50 }])}>Add ticket type</button>}
      </section>
      <div className="flex gap-3"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Submit for approval'}</button><Link to="/organizer" className="btn-ghost">Cancel</Link></div>
    </form>
  );
}
