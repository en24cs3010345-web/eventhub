import { useState } from 'react';
import { Field } from '../components/ui';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth(); const toast = useToast();
  const [p, setP] = useState({ name: user.name, phone: user.phone || '' }); const [pe, setPe] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' }); const [we, setWe] = useState({});
  const save = async (e) => {
    e.preventDefault();
    if (p.name.trim().length < 2) return setPe({ name: 'Enter your name' });
    if (p.phone && !/^[6-9]\d{9}$/.test(p.phone)) return setPe({ phone: 'Enter a valid 10-digit mobile number' });
    try { const { data } = await api.put('/auth/profile', p); setUser(data.user); setPe({}); toast('Profile saved'); } catch (er) { setPe(fieldErrors(er)); toast(errMsg(er), 'error'); }
  };
  const change = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) return setWe({ newPassword: 'Use 8+ characters with a letter and a number' });
    try { await api.put('/auth/password', pw); setPw({ currentPassword: '', newPassword: '' }); setWe({}); toast('Password updated'); } catch (er) { setWe(fieldErrors(er)); toast(errMsg(er), 'error'); }
  };
  return (
    <div className="wrap max-w-2xl py-10">
      <h1 className="text-4xl font-extrabold">Profile</h1>
      <p className="mt-1 text-muted">{user.email} · <span className="capitalize">{user.role}</span></p>
      <form onSubmit={save} className="card mt-6 space-y-4 p-6" noValidate>
        <h2 className="text-lg font-bold">Personal details</h2>
        <Field label="Full name" error={pe.name}><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <Field label="Mobile" error={pe.phone}><input className="input" inputMode="numeric" maxLength={10} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <button className="btn-primary">Save changes</button>
      </form>
      <form onSubmit={change} className="card mt-6 space-y-4 p-6" noValidate>
        <h2 className="text-lg font-bold">Change password</h2>
        <Field label="Current password" error={we.currentPassword}><input type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="New password" error={we.newPassword}><input type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <button className="btn-primary">Update password</button>
      </form>
    </div>
  );
}
