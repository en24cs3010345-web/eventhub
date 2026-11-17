import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field } from '../components/ui';
import { errMsg, fieldErrors } from '../utils/format';

function Shell({ title, sub, children, foot }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#2A1B6B] via-[#6A2BD9] to-accent p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute right-10 top-10 text-[10rem] opacity-20" aria-hidden>🎟</div>
        <h2 className="max-w-md text-4xl font-extrabold leading-tight">Your next favourite night out is one tap away.</h2>
        <p className="mt-3 max-w-sm text-white/80">Instant QR tickets, secure payments and events in every major Indian city.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold">{title}</h1><p className="mt-1 text-muted">{sub}</p>
          <div className="mt-8">{children}</div><p className="mt-6 text-center text-sm text-muted">{foot}</p>
        </div>
      </div>
    </div>
  );
}
const useForm = (init) => {
  const [v, setV] = useState(init); const [errors, setErrors] = useState({}); const [busy, setBusy] = useState(false);
  return { v, errors, setErrors, busy, setBusy, bind: (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }) }), set: (k, x) => setV({ ...v, [k]: x }) };
};

export function Login() {
  const { user, login } = useAuth(); const nav = useNavigate(); const loc = useLocation(); const toast = useToast();
  const f = useForm({ email: '', password: '' });
  if (user) return <Navigate to={loc.state?.from || '/'} replace />;
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(f.v.email)) errs.email = 'Enter a valid email';
    if (!f.v.password) errs.password = 'Enter your password';
    f.setErrors(errs); if (Object.keys(errs).length) return;
    f.setBusy(true);
    try { const u = await login(f.v); nav(loc.state?.from || (u.role === 'admin' ? '/admin' : u.role === 'organizer' ? '/organizer' : '/'), { replace: true }); }
    catch (err) { toast(errMsg(err), 'error'); f.setErrors(fieldErrors(err)); } finally { f.setBusy(false); }
  };
  return (
    <Shell title="Welcome back" sub="Log in to see your bookings and tickets." foot={<>New here? <Link to="/register" className="font-bold text-accent">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={f.errors.email}><input type="email" autoComplete="email" className="input" {...f.bind('email')} /></Field>
        <Field label="Password" error={f.errors.password}><input type="password" autoComplete="current-password" className="input" {...f.bind('password')} /></Field>
        <button className="btn-primary w-full" disabled={f.busy}>{f.busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p className="mt-6 rounded-xl bg-line/50 p-3 text-xs text-muted">Demo logins (after seeding), password <b>Password@123</b>: admin@eventhub.in, organizer@eventhub.in, user@eventhub.in</p>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth(); const nav = useNavigate(); const toast = useToast(); const [sp] = useSearchParams();
  const f = useForm({ name: '', email: '', phone: '', password: '', role: sp.get('role') === 'organizer' ? 'organizer' : 'user' });
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault();
    const { name, email, phone, password } = f.v; const errs = {};
    if (name.trim().length < 2) errs.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (phone && !/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Enter a valid 10-digit mobile number';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.password = 'Use 8+ characters with a letter and a number';
    f.setErrors(errs); if (Object.keys(errs).length) return;
    f.setBusy(true);
    try { const u = await register(f.v); toast('Account created. Welcome to EventHub!'); nav(u.role === 'organizer' ? '/organizer' : '/'); }
    catch (err) { toast(errMsg(err), 'error'); f.setErrors(fieldErrors(err)); } finally { f.setBusy(false); }
  };
  return (
    <Shell title="Create your account" sub="Book tickets or host your own events." foot={<>Already registered? <Link to="/login" className="font-bold text-accent">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {[['user', 'I want to attend'], ['organizer', 'I host events']].map(([k, l]) => (
            <button type="button" key={k} role="radio" aria-checked={f.v.role === k} onClick={() => f.set('role', k)} className={`chip justify-center ${f.v.role === k ? 'chip-on' : ''}`}>{l}</button>
          ))}
        </div>
        <Field label="Full name" error={f.errors.name}><input autoComplete="name" className="input" {...f.bind('name')} /></Field>
        <Field label="Email" error={f.errors.email}><input type="email" autoComplete="email" className="input" {...f.bind('email')} /></Field>
        <Field label="Mobile (optional)" error={f.errors.phone}><input inputMode="numeric" maxLength={10} className="input" placeholder="10-digit number" {...f.bind('phone')} /></Field>
        <Field label="Password" error={f.errors.password} hint="At least 8 characters, with a letter and a number"><input type="password" autoComplete="new-password" className="input" {...f.bind('password')} /></Field>
        <button className="btn-primary w-full" disabled={f.busy}>{f.busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  );
}
