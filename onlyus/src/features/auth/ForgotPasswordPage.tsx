import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './authStore';
import { AuthShell, btnCls, inputCls } from './AuthShell';

export default function ForgotPasswordPage() {
  const sendReset = useAuth((s) => s.sendReset);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) { e.preventDefault(); await sendReset(email); setSent(true); }

  return (
    <AuthShell title="Reset password">
      {sent ? <p className="text-center text-white/70">If that email is approved, a reset link is on its way.</p> : (
        <form onSubmit={submit} className="space-y-3">
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className={btnCls}>Send reset link</button>
        </form>
      )}
      <Link to="/login" className="block text-center text-sm text-white/60">Back to sign in</Link>
    </AuthShell>
  );
}
