import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Poster from '../components/Poster';
import { Spinner } from '../components/ui';
import { fetchEvents, fetchCategories } from '../api/client';
import { fmtDate, inr } from '../utils/format';

const CITIES = ['Bhopal', 'Indore', 'Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Jaipur'];

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState(''); const [city, setCity] = useState('');
  const [events, setEvents] = useState(null); const [cats, setCats] = useState([]); const [offline, setOffline] = useState(false);
  useEffect(() => {
    fetchEvents({ limit: 40 }).then((r) => { setEvents(r.events); setOffline(r.offline); }).catch(() => setEvents([]));
    fetchCategories().then(setCats);
  }, []);
  const go = (e) => { e.preventDefault(); const p = new URLSearchParams(); if (q) p.set('q', q); if (city) p.set('city', city); nav(`/events?${p}`); };
  const featured = (events || []).filter((e) => e.is_featured);
  const top = (featured.length ? featured : events || []).slice(0, 3);
  const sections = cats.map((c) => ({ c, list: (events || []).filter((e) => e.category_slug === c.slug).slice(0, 4) })).filter((s) => s.list.length).slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-brand/20 blur-3xl" aria-hidden />
        <div className="wrap relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.05] sm:text-6xl">Find something worth leaving the house for.</h1>
            <p className="mt-5 max-w-xl text-lg text-muted">Concerts, stand-up, marathons and workshops in your city. Book in under a minute and walk in with a QR code.</p>
            <form onSubmit={go} className="card mt-8 flex flex-col gap-2 p-2 shadow-xl shadow-accent/10 sm:flex-row" role="search">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input !border-0 sm:w-40" aria-label="City">
                <option value="">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input value={q} onChange={(e) => setQ(e.target.value)} className="input !border-0 flex-1" placeholder="Search artists, events or venues" aria-label="Search events" />
              <button className="btn-primary">Search</button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {CITIES.slice(0, 6).map((c) => <Link key={c} to={`/events?city=${c}`} className="chip">{c}</Link>)}
            </div>
          </div>
          <div className="hero-stack relative mx-auto hidden h-[26rem] w-full max-w-md lg:block" aria-hidden={!top.length}>
            {top.map((e, i) => (
              <Link key={e.id} to={`/events/${e.id}`} className="stub card absolute w-72 overflow-visible shadow-2xl transition hover:z-10 hover:scale-[1.02]"
                style={{ '--r': `${[-6, 3, -1][i]}deg`, transform: `rotate(${[-6, 3, -1][i]}deg)`, left: `${[0, 22, 4][i] * 4}px`, top: `${i * 118}px`, zIndex: 3 - i, '--notch': '50%' }}>
                <div className="flex">
                  <Poster event={e} className="h-24 w-24 shrink-0 rounded-l-2xl text-[0px]" />
                  <div className="min-w-0 border-l border-dashed border-line p-3">
                    <p className="truncate font-bold">{e.title}</p>
                    <p className="text-xs text-muted">{fmtDate(e.event_date, { day: 'numeric', month: 'short' })} · {e.city}</p>
                    <p className="mt-1 text-sm font-bold text-accent">{inr(e.min_price ?? 0)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {offline && <p className="bg-brand/20 py-2 text-center text-sm">Server not reachable — showing sample events. Start the backend to see live data.</p>}
      <div className="wrap space-y-16 pt-14">
        <section>
          <div className="mb-6 flex items-end justify-between"><h2 className="text-3xl font-extrabold">Trending this week</h2><Link to="/events?sort=popular" className="text-sm font-bold text-accent">See all</Link></div>
          {!events ? <Spinner /> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{(featured.length ? featured : events).slice(0, 6).map((e) => <EventCard key={e.id} event={e} />)}</div>}
        </section>

        <section>
          <h2 className="mb-6 text-3xl font-extrabold">Browse by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cats.map((c) => (
              <Link key={c.id} to={`/events?category=${c.slug}`} className="card flex items-center gap-3 p-4 font-bold transition hover:border-accent">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-2xl">{c.icon}</span>{c.name}
              </Link>
            ))}
          </div>
        </section>

        {sections.map(({ c, list }) => (
          <section key={c.id}>
            <div className="mb-6 flex items-end justify-between"><h2 className="text-2xl font-extrabold">{c.icon} {c.name}</h2><Link to={`/events?category=${c.slug}`} className="text-sm font-bold text-accent">More {c.name.toLowerCase()}</Link></div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{list.map((e) => <EventCard key={e.id} event={e} />)}</div>
          </section>
        ))}

        <section className="card flex flex-col items-start justify-between gap-6 bg-gradient-to-br from-accent/10 to-brand/10 p-8 sm:flex-row sm:items-center sm:p-12">
          <div><h2 className="text-3xl font-extrabold">Hosting something?</h2><p className="mt-2 max-w-lg text-muted">List your event, set ticket tiers, track sales live and scan guests in at the door. Free to start.</p></div>
          <Link to="/register?role=organizer" className="btn-brand shrink-0">Become an organizer</Link>
        </section>
      </div>
    </>
  );
}
