// Sample data: 3 demo accounts, categories and upcoming events across Indian cities.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const day = (n) => { const d = new Date(Date.now() + n * 864e5); return d.toISOString().slice(0, 10); };
const CATS = [['Music', 'music', '🎵'], ['Comedy', 'comedy', '🎤'], ['Sports', 'sports', '🏏'], ['Workshops', 'workshops', '🛠️'],
  ['Food & Drink', 'food-drink', '🍜'], ['Tech', 'tech', '💻'], ['Arts & Culture', 'arts-culture', '🎭'], ['Nightlife', 'nightlife', '🪩']];

// [title, category slug, city, venue, address, state, daysFromNow, time, featured, seated, tickets[[name, price, qty]], description]
const EVENTS = [
  ['Monsoon Indie Nights', 'music', 'Bhopal', 'Bharat Bhavan Open Arena', 'Shamla Hills', 'Madhya Pradesh', 6, '18:30', true, false, [['Early Bird', 499, 150], ['General', 799, 400], ['VIP Front Row', 1999, 60]], 'An evening of original indie bands from across central India, set against the Upper Lake skyline. Food stalls and a craft market open from 5 PM.'],
  ['The Laugh Circuit: Stand-up Live', 'comedy', 'Mumbai', 'Habitat Comedy Club', 'Khar West', 'Maharashtra', 3, '20:00', true, false, [['Standard', 599, 120], ['Premium', 999, 40]], 'Five of the country’s sharpest stand-up comics, one stage, ninety minutes. Hindi and English sets.'],
  ['Sunday Run: Lake City 10K', 'sports', 'Bhopal', 'Boat Club Road', 'Upper Lake', 'Madhya Pradesh', 12, '05:30', false, false, [['10K', 450, 500], ['5K', 350, 500], ['Fun Run (Kids)', 0, 200]], 'A chip-timed 10K and 5K along the lake. Finisher medals, breakfast and a post-run Zumba session for everyone.'],
  ['Bengaluru Product & AI Summit', 'tech', 'Bengaluru', 'KTPO Convention Centre', 'Whitefield', 'Karnataka', 20, '09:30', true, false, [['Student', 499, 200], ['Delegate', 2499, 600], ['Startup Pass', 3999, 100]], 'One day, three tracks: product, applied AI and developer tooling. Talks from founders and engineers building in India, plus a startup demo floor.'],
  ['Kathak Under the Stars', 'arts-culture', 'Delhi', 'Kamani Auditorium', 'Copernicus Marg', 'Delhi', 9, '19:00', false, true, [['Gold Circle', 1500, 0], ['Silver', 900, 0], ['Balcony', 500, 0]], 'A solo Kathak recital with live tabla and sitar accompaniment. Reserved seating — pick your own seats.'],
  ['Street Food Carnival', 'food-drink', 'Indore', 'Rajwada Palace Grounds', 'Rajwada', 'Madhya Pradesh', 8, '16:00', true, false, [['Entry + 5 Coupons', 299, 800], ['Family (4 pax)', 999, 150]], 'Forty vendors, one lane: poha-jalebi, bhutte ki kees, garadu and more. Live folk music after sunset.'],
  ['Pune Pottery & Clay Workshop', 'workshops', 'Pune', 'Studio Mitti', 'Koregaon Park', 'Maharashtra', 5, '11:00', false, false, [['Single Session', 1200, 16]], 'A relaxed three-hour wheel-throwing session for beginners. Materials, tea and firing of one piece included.'],
  ['Hyderabad Electronic Night', 'nightlife', 'Hyderabad', 'Hitex Open Grounds', 'Madhapur', 'Telangana', 15, '21:00', false, false, [['General', 1499, 1200], ['Gold', 2999, 300]], 'House and techno from India’s leading electronic acts on a full-scale sound rig. 21+ with valid ID.'],
  ['Chennai Filter Coffee Festival', 'food-drink', 'Chennai', 'Island Grounds', 'Anna Salai', 'Tamil Nadu', 11, '10:00', false, false, [['Day Pass', 250, 1000]], 'Roasters, brew bars and tasting flights from Coorg to Chikmagalur, with latte-art contests and cupping workshops.'],
  ['Jaipur Folk & Fusion Evening', 'music', 'Jaipur', 'Albert Hall Lawns', 'Ram Niwas Garden', 'Rajasthan', 18, '18:00', true, false, [['General', 699, 600], ['Lounge', 1799, 100]], 'Manganiyar folk artists meet contemporary fusion musicians in the lawns of Albert Hall.'],
];

(async () => {
  try {
    const pw = await bcrypt.hash('Password@123', 12);
    const users = {};
    for (const [name, email, role] of [['Admin', 'admin@eventhub.in', 'admin'], ['Riya Organizer', 'organizer@eventhub.in', 'organizer'], ['Aman User', 'user@eventhub.in', 'user']]) {
      const r = await pool.query(
        `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET role=EXCLUDED.role RETURNING id`, [name, email, pw, role]);
      users[role] = r.rows[0].id;
    }
    const cat = {};
    for (const [n, s, i] of CATS) {
      const r = await pool.query('INSERT INTO categories(name,slug,icon) VALUES($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id', [n, s, i]);
      cat[s] = r.rows[0].id;
    }
    const have = await pool.query('SELECT COUNT(*)::int n FROM events');
    if (have.rows[0].n > 0) { console.log('ℹ️  Events already exist — skipping event seed'); return; }
    for (const [title, c, city, vname, addr, state, d, time, feat, seated, tickets, desc] of EVENTS) {
      const v = await pool.query('INSERT INTO venues(name,address,city,state,capacity) VALUES($1,$2,$3,$4,$5) RETURNING id', [vname, addr, city, state, 1000]);
      const e = await pool.query(
        `INSERT INTO events(organizer_id,category_id,venue_id,title,description,event_date,event_time,status,is_featured,is_seated)
         VALUES($1,$2,$3,$4,$5,$6,$7,'approved',$8,$9) RETURNING id`, [users.organizer, cat[c], v.rows[0].id, title, desc, day(d), time, feat, seated]);
      if (seated) {
        const rows = [['A', 'B'], ['C', 'D', 'E'], ['F', 'G', 'H']];
        for (let t = 0; t < tickets.length; t++) {
          const tt = await pool.query('INSERT INTO ticket_types(event_id,name,price,quantity) VALUES($1,$2,$3,$4) RETURNING id', [e.rows[0].id, tickets[t][0], tickets[t][1], rows[t].length * 10]);
          for (const r of rows[t]) for (let n = 1; n <= 10; n++)
            await pool.query('INSERT INTO seats(venue_id,event_id,ticket_type_id,seat_number) VALUES($1,$2,$3,$4)', [v.rows[0].id, e.rows[0].id, tt.rows[0].id, `${r}${n}`]);
        }
      } else for (const [n, p, q] of tickets)
        await pool.query('INSERT INTO ticket_types(event_id,name,price,quantity) VALUES($1,$2,$3,$4)', [e.rows[0].id, n, p, q]);
    }
    console.log('✅ Seeded. Logins (password: Password@123): admin@eventhub.in · organizer@eventhub.in · user@eventhub.in');
  } catch (e) { console.error('❌', e.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
