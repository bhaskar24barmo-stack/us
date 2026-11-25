import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from './authStore';
import { AuthShell, btnCls, inputCls } from './AuthShell';

export default function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    setError(await signIn(email, password));
    setBusy(false);
  }

  return (
    <AuthShell title="ONLYUS" subtitle="Just the two of us.">
      <form onSubmit={submit} className="space-y-3">
        <input className={inputCls} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <Link to="/forgot" className="block text-center text-sm text-white/60">Forgot password?</Link>
    </AuthShell>
  );
}
