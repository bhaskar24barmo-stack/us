import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './authStore';
import { AuthShell, btnCls, inputCls } from './AuthShell';

export default function ResetPasswordPage() {
  const { session, ready, setNewPassword } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (ready && !session) return <Navigate to="/login" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err = await setNewPassword(pw);
    if (err) setError(err); else nav('/', { replace: true });
  }

  return (
    <AuthShell title="New password" subtitle="At least 12 characters.">
      <form onSubmit={submit} className="space-y-3">
        <input className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button className={btnCls}>Save password</button>
      </form>
    </AuthShell>
  );
}
