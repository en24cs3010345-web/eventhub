const d = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
export const SAMPLE_CATEGORIES = [
  { id: 1, name: 'Music', slug: 'music', icon: '🎵' }, { id: 2, name: 'Comedy', slug: 'comedy', icon: '🎤' },
  { id: 3, name: 'Sports', slug: 'sports', icon: '🏏' }, { id: 4, name: 'Workshops', slug: 'workshops', icon: '🛠️' },
  { id: 5, name: 'Food & Drink', slug: 'food-drink', icon: '🍜' }, { id: 6, name: 'Tech', slug: 'tech', icon: '💻' },
];
const mk = (id, title, cat, slug, icon, city, venue, n, time, price, feat, description) => ({
  id, title, category: cat, category_slug: slug, category_icon: icon, city, venue_name: venue, address: venue,
  event_date: d(n), event_time: time, min_price: price, is_featured: feat, available: 100, description, is_seated: false,
  ticket_types: [{ id: id * 10, name: 'General', price, available: 100 }], organizer_name: 'Sample Organizer',
});
export const SAMPLE_EVENTS = [
  mk(1, 'Monsoon Indie Nights', 'Music', 'music', '🎵', 'Bhopal', 'Bharat Bhavan Open Arena', 6, '18:30', 499, true, 'Original indie bands from across central India by the Upper Lake.'),
  mk(2, 'The Laugh Circuit: Stand-up Live', 'Comedy', 'comedy', '🎤', 'Mumbai', 'Habitat Comedy Club', 3, '20:00', 599, true, 'Five sharp stand-up comics, one stage.'),
  mk(3, 'Sunday Run: Lake City 10K', 'Sports', 'sports', '🏏', 'Bhopal', 'Boat Club Road', 12, '05:30', 350, false, 'Chip-timed 10K and 5K along the lake.'),
  mk(4, 'Bengaluru Product & AI Summit', 'Tech', 'tech', '💻', 'Bengaluru', 'KTPO Convention Centre', 20, '09:30', 499, true, 'Three tracks on product, applied AI and developer tools.'),
  mk(5, 'Street Food Carnival', 'Food & Drink', 'food-drink', '🍜', 'Indore', 'Rajwada Palace Grounds', 8, '16:00', 299, true, 'Forty vendors, one lane, live folk music after sunset.'),
  mk(6, 'Pune Pottery & Clay Workshop', 'Workshops', 'workshops', '🛠️', 'Pune', 'Studio Mitti', 5, '11:00', 1200, false, 'A relaxed three-hour wheel-throwing session for beginners.'),
];
