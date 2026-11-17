import { Link } from 'react-router-dom';

export const Spinner = ({ label = 'Loading' }) => (
  <div className="flex justify-center py-20" role="status" aria-label={label}>
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent" />
  </div>
);
export const Empty = ({ title, hint, action }) => (
  <div className="card mx-auto max-w-md p-10 text-center">
    <h3 className="text-xl font-bold">{title}</h3>
    {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    {action && <Link to={action.to} className="btn-primary mt-5">{action.label}</Link>}
  </div>
);
export const Field = ({ label, error, children, hint }) => (
  <div>
    <label className="label">{label}</label>{children}
    {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
    {error && <p className="err" role="alert">{error}</p>}
  </div>
);
const TONES = { confirmed: 'bg-emerald-500/15 text-emerald-600', approved: 'bg-emerald-500/15 text-emerald-600', valid: 'bg-emerald-500/15 text-emerald-600',
  pending: 'bg-amber-500/15 text-amber-600', cancelled: 'bg-red-500/15 text-red-500', rejected: 'bg-red-500/15 text-red-500', used: 'bg-slate-500/15 text-muted', expired: 'bg-slate-500/15 text-muted' };
export const Badge = ({ status }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${TONES[status] || 'bg-line text-muted'}`}>{status}</span>;
export const StatCard = ({ label, value, hint }) => (
  <div className="card p-5"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-3xl font-extrabold">{value}</p>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
);
export const BarChart = ({ data, labelKey = 'day', valueKey = 'revenue' }) => {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey])));
  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Revenue over the last 14 days">
      {data.map((d) => (
        <div key={d[labelKey]} className="group flex flex-1 flex-col items-center justify-end" title={`${d[labelKey]}: ₹${Number(d[valueKey]).toLocaleString('en-IN')}`}>
          <div className="w-full rounded-t-md bg-accent/80 group-hover:bg-accent" style={{ height: `${Math.max(3, (Number(d[valueKey]) / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
};
export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex flex-wrap gap-2" role="tablist">
    {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`chip ${value === k ? 'chip-on' : ''}`}>{l}</button>)}
  </div>
);
