import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Logo = () => (
  <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white" aria-hidden>🎟</span>EventHub
  </Link>
);
export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); localStorage.setItem('theme', d ? 'dark' : 'light'); };
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`;
  const dash = user?.role === 'admin' ? ['/admin', 'Admin'] : user?.role === 'organizer' ? ['/organizer', 'Organizer'] : null;
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/events" className={link}>Explore</NavLink>
          {user && <NavLink to="/my-bookings" className={link}>My bookings</NavLink>}
          {dash && <NavLink to={dash[0]} className={link}>{dash[1]}</NavLink>}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={toggle} className="btn-ghost !px-3" aria-label="Toggle dark mode">{dark ? '☀️' : '🌙'}</button>
          {user ? (<>
            <Link to="/profile" className="btn-ghost">{user.name.split(' ')[0]}</Link>
            <button onClick={() => { logout(); nav('/'); }} className="btn-ghost">Log out</button>
          </>) : (<>
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/register" className="btn-primary">Sign up</Link>
          </>)}
        </div>
        <button className="btn-ghost !px-3 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">{open ? '✕' : '☰'}</button>
      </div>
      {open && (
        <div className="wrap flex flex-col gap-1 border-t border-line pb-4 pt-2 md:hidden" onClick={close}>
          <NavLink to="/events" className={link}>Explore</NavLink>
          {user && <NavLink to="/my-bookings" className={link}>My bookings</NavLink>}
          {user && <NavLink to="/profile" className={link}>Profile</NavLink>}
          {dash && <NavLink to={dash[0]} className={link}>{dash[1]} dashboard</NavLink>}
          <div className="mt-2 flex gap-2">
            <button onClick={toggle} className="btn-ghost">{dark ? '☀️ Light' : '🌙 Dark'}</button>
            {user ? <button onClick={() => { logout(); nav('/'); }} className="btn-ghost">Log out</button>
              : <><Link to="/login" className="btn-ghost">Log in</Link><Link to="/register" className="btn-primary">Sign up</Link></>}
          </div>
        </div>
      )}
    </header>
  );
}
