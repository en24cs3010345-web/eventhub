import { inr } from '../utils/format';
const TIER = [
  { seat: 'bg-accent/25 hover:bg-accent/60', dot: 'bg-accent/60' },
  { seat: 'bg-teal/25 hover:bg-teal/60', dot: 'bg-teal/60' },
  { seat: 'bg-brand/30 hover:bg-brand/70', dot: 'bg-brand/70' },
];

export default function SeatMap({ seats, types, selected, onToggle }) {
  const rows = {};
  seats.forEach((s) => { (rows[s.seat_number[0]] ||= []).push(s); });
  const tierOf = (id) => types.findIndex((t) => t.id === id);
  return (
    <div>
      <div className="mx-auto mb-6 h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent" aria-hidden />
      <p className="mb-4 text-center text-xs text-muted">Stage this side</p>
      <div className="space-y-2 overflow-x-auto pb-2">
        {Object.entries(rows).map(([r, list]) => (
          <div key={r} className="flex items-center justify-center gap-1.5">
            <span className="w-5 text-xs font-bold text-muted">{r}</span>
            {list.map((s) => {
              const on = selected.includes(s.id), taken = s.status !== 'available';
              return (
                <button key={s.id} type="button" disabled={taken} onClick={() => onToggle(s.id)} aria-pressed={on}
                  aria-label={`Seat ${s.seat_number}${taken ? ', unavailable' : ''}`}
                  className={`h-8 w-8 shrink-0 rounded-t-lg text-[10px] font-bold transition ${taken ? 'cursor-not-allowed bg-line text-muted/50' : on ? 'bg-ink text-bg ring-2 ring-ink' : (TIER[tierOf(s.ticket_type_id)] || TIER[0]).seat}`}>
                  {s.seat_number.slice(1)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs">
        {types.map((t, i) => <span key={t.id} className="flex items-center gap-1.5"><i className={`h-3 w-3 rounded-sm ${(TIER[i] || TIER[0]).dot}`} />{t.name} · {inr(t.price)}</span>)}
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-ink" />Selected</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-line" />Taken</span>
      </div>
    </div>
  );
}
