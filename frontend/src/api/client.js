import axios from 'axios';
import { SAMPLE_EVENTS, SAMPLE_CATEGORIES } from '../data/sampleEvents';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401 && localStorage.getItem('token') && !err.config.url.includes('/auth/')) {
    localStorage.removeItem('token'); window.dispatchEvent(new Event('auth:expired'));
  }
  return Promise.reject(err);
});
export default api;

/* Public browse calls fall back to bundled sample data when the API is offline, so the UI always renders. */
export async function fetchEvents(params = {}) {
  try { const { data } = await api.get('/events', { params }); return { ...data, offline: false }; }
  catch (e) {
    if (e.response) throw e;
    let list = [...SAMPLE_EVENTS];
    if (params.q) list = list.filter((x) => (x.title + x.city).toLowerCase().includes(params.q.toLowerCase()));
    if (params.category) list = list.filter((x) => x.category_slug === params.category);
    if (params.city) list = list.filter((x) => x.city.toLowerCase() === params.city.toLowerCase());
    if (params.featured) list = list.filter((x) => x.is_featured);
    return { events: list, total: list.length, pages: 1, offline: true };
  }
}
export async function fetchCategories() {
  try { return (await api.get('/categories')).data.categories; } catch { return SAMPLE_CATEGORIES; }
}
export async function fetchEvent(id) {
  try { return { event: (await api.get(`/events/${id}`)).data.event, offline: false }; }
  catch (e) {
    if (e.response) throw e;
    const ev = SAMPLE_EVENTS.find((x) => String(x.id) === String(id));
    if (!ev) throw e;
    return { event: ev, offline: true };
  }
}
