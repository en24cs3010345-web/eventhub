import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import { Empty, Spinner } from '../components/ui';
import { fetchEvents, fetchCategories } from '../api/client';
import api from '../api/client';

const DATES = [['', 'Any date'], ['today', 'Today'], ['weekend', 'This weekend'], ['week', 'Next 7 days']];

export default function Events() {
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState(null); const [cats, setCats] = useState([]); const [cities, setCities] = useState([]);
  const [text, setText] = useState(sp.get('q') || '');
  const get = (k, d = '') => sp.get(k) || d;
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); n.delete('page'); setSp(n); };

  useEffect(() => { fetchCategories().then(setCats); api.get('/events/cities').then((r) => setCities(r.data.cities)).catch(() => {}); }, []);
  useEffect(() => { setText(get('q')); }, [sp.get('q')]);
  useEffect(() => {
    setData(null);
    fetchEvents({ q: get('q'), category: get('category'), city: get('city'), date: get('date'), sort: get('sort', 'date'), page: get('page', 1), limit: 12 })
      .then(setData).catch(() => setData({ events: [], total: 0, pages: 1, error: true }));
  }, [sp]);
  const page = Number(get('page', 1));

  return (
    <div className="wrap py-10">
      <h1 className="text-4xl font-extrabold">Explore events</h1>
      <form onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }} className="mt-6 flex flex-col gap-3 sm:flex-row" role="search">
        <input className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by event, artist or venue" aria-label="Search events" />
        <select className="input sm:w-44" value={get('city')} onChange={(e) => set('city', e.target.value)} aria-label="City">
          <option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input sm:w-44" value={get('sort', 'date')} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          <option value="date">Soonest first</option><option value="popular">Most popular</option><option value="price">Lowest price</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={`chip ${!get('category') ? 'chip-on' : ''}`} onClick={() => set('category', '')}>All</button>
        {cats.map((c) => <button key={c.id} className={`chip ${get('category') === c.slug ? 'chip-on' : ''}`} onClick={() => set('category', c.slug)}>{c.icon} {c.name}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DATES.map(([k, l]) => <button key={k} className={`chip ${get('date') === k ? 'chip-on' : ''}`} onClick={() => set('date', k)}>{l}</button>)}
        <input type="date" className="chip" aria-label="Pick a date" value={/^\d{4}/.test(get('date')) ? get('date') : ''} onChange={(e) => set('date', e.target.value)} />
      </div>

      <div className="mt-8">
        {!data ? <Spinner /> : data.error ? <Empty title="Couldn’t load events" hint="Check that the backend is running, then refresh." />
          : !data.events.length ? <Empty title="No events match your filters" hint="Try a different city, date or category." action={{ to: '/events', label: 'Clear filters' }} />
          : (<>
            {data.offline && <p className="mb-4 rounded-xl bg-brand/20 p-3 text-center text-sm">Server not reachable — showing sample events.</p>}
            <p className="mb-4 text-sm text-muted">{data.total} event{data.total === 1 ? '' : 's'}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.events.map((e) => <EventCard key={e.id} event={e} />)}</div>
            {data.pages > 1 && (
              <div className="mt-10 flex justify-center gap-2">
                <button className="btn-ghost" disabled={page <= 1} onClick={() => setSp({ ...Object.fromEntries(sp), page: page - 1 })}>Previous</button>
                <span className="grid place-items-center px-3 text-sm text-muted">Page {page} of {data.pages}</span>
                <button className="btn-ghost" disabled={page >= data.pages} onClick={() => setSp({ ...Object.fromEntries(sp), page: page + 1 })}>Next</button>
              </div>)}
          </>)}
      </div>
    </div>
  );
}
