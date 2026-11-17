export const inr = (n) => (Number(n) === 0 ? 'Free' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n)));
const parts = (d) => { const [y, m, day] = String(d).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, day); };
export const fmtDate = (d, o = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => parts(d).toLocaleDateString('en-IN', o);
export const dayNum = (d) => parts(d).getDate();
export const monthShort = (d) => parts(d).toLocaleDateString('en-IN', { month: 'short' });
export const fmtTime = (t) => { const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
export const isPast = (d, t) => new Date(`${String(d).slice(0, 10)}T${String(t).slice(0, 5)}`) < new Date();
export const errMsg = (e) => e?.response?.data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : e?.message || 'Something went wrong');
export const fieldErrors = (e) => Object.fromEntries((e?.response?.data?.details || []).map((d) => [d.field, d.message]));
