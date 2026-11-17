import { Link } from 'react-router-dom';
import Poster from './Poster';
import { dayNum, monthShort, fmtTime, inr } from '../utils/format';

export default function EventCard({ event: e }) {
  return (
    <Link to={`/events/${e.id}`} className="stub card group block overflow-visible transition hover:-translate-y-0.5 hover:border-accent" style={{ '--notch': '57%' }}>
      <div className="relative overflow-hidden rounded-t-2xl">
        <Poster event={e} className="aspect-[16/10] w-full transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{e.category_icon} {e.category}</span>
        {Number(e.available) > 0 && Number(e.available) <= 20 && <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-[#1B1534]">{e.available} left</span>}
        {Number(e.available) === 0 && <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">Sold out</span>}
      </div>
      <div className="border-t border-dashed border-line" />
      <div className="flex items-center gap-4 p-4">
        <div className="w-12 shrink-0 text-center leading-none">
          <p className="font-display text-2xl font-extrabold">{dayNum(e.event_date)}</p>
          <p className="mt-1 text-xs font-bold text-accent">{monthShort(e.event_date)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold">{e.title}</h3>
          <p className="truncate text-sm text-muted">{e.venue_name}, {e.city} · {fmtTime(e.event_time)}</p>
        </div>
        <p className="shrink-0 text-right text-sm"><span className="block text-xs text-muted">from</span><span className="font-bold">{inr(e.min_price ?? 0)}</span></p>
      </div>
    </Link>
  );
}
