const HUES = { music: ['#E0306E', '#6A2BD9'], comedy: ['#FFB224', '#E0306E'], sports: ['#0FA3A3', '#1B5E9E'], workshops: ['#E8742A', '#B5226B'],
  'food-drink': ['#F2A007', '#C8321E'], tech: ['#3B5BDB', '#0FA3A3'], 'arts-culture': ['#7A2BB5', '#E0306E'], nightlife: ['#2A1B6B', '#E0306E'] };
/** Poster image, or a category-coloured fallback when no image was uploaded. */
export default function Poster({ event, className = '', big = false }) {
  if (event.poster_url) return <img src={event.poster_url} alt={`${event.title} poster`} loading="lazy" className={`object-cover ${className}`} />;
  const [a, b] = HUES[event.category_slug] || ['#6A2BD9', '#E0306E'];
  return (
    <div className={`relative flex items-end overflow-hidden p-4 text-white ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} aria-label={`${event.title} poster`}>
      <span className="absolute right-3 top-2 text-5xl opacity-30">{event.category_icon || '🎟️'}</span>
      <span className={`font-display font-extrabold leading-tight ${big ? 'text-3xl' : 'text-lg'}`}>{event.title}</span>
    </div>
  );
}
