import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="wrap flex flex-col justify-between gap-6 py-10 text-sm text-muted sm:flex-row">
        <div><p className="font-display text-lg font-extrabold text-ink">EventHub</p><p className="mt-1 max-w-xs">Discover and book live events across India. Tickets arrive instantly as QR codes.</p></div>
        <div className="flex gap-10">
          <div className="flex flex-col gap-2"><Link to="/events">Explore events</Link><Link to="/my-bookings">My bookings</Link></div>
          <div className="flex flex-col gap-2"><Link to="/register">Host an event</Link><Link to="/login">Log in</Link></div>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">B.Tech CSE Minor Project · Built with React, Node.js, PostgreSQL & Razorpay</p>
    </footer>
  );
}
