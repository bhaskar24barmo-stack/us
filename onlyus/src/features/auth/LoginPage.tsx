import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { useAuth } from './authStore';
import { AuthShell, btnCls, inputCls } from './AuthShell';
import type { UserRole } from '@/types/models';

const PARTNERS = [
  { role: 'me' as UserRole, name: 'Bhaskar', email: 'gnbhaskar636@gmail.com', emoji: '🖤' },
  { role: 'partner' as UserRole, name: 'Purvika', email: 'mamathakp9481@gmail.com', emoji: '🌸' },
];

export default function LoginPage() {
  const { session, signIn, signInWithOtp, verifyOtp } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<'me' | 'partner'>('me');
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('gnbhaskar636@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  function handleSelectPartner(p: (typeof PARTNERS)[number]) {
    setSelectedPartner(p.role);
    setEmail(p.email);
    setError(null);
    setSuccess(null);
    setOtpSent(false);
    setOtpToken('');
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  async function handleSendOtp() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await signInWithOtp(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send verification code.');
    } else {
      setOtpSent(true);
      setSuccess(`6-digit login code sent to ${email}! Check your inbox.`);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await verifyOtp(email, otpToken);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Invalid or expired code.');
  }

  return (
    <AuthShell title="ONLYUS" subtitle="Just the two of us.">
      <div className="space-y-4">
        {/* Partner Select Pills */}
        <div className="grid grid-cols-2 gap-2">
          {PARTNERS.map((p) => {
            const isSel = selectedPartner === p.role;
            return (
              <button
                key={p.role}
                type="button"
                onClick={() => handleSelectPartner(p)}
                className={`p-2.5 rounded-2xl flex items-center gap-2 border text-left transition-all ${
                  isSel
                    ? 'bg-white/15 border-rose-glow shadow-glow-pink'
                    : 'glass border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{p.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold">{p.name}</div>
                  <div className="text-[10px] text-white/60 truncate">{p.email.split('@')[0]}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setError(null); }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              authMode === 'password' ? 'bg-love-gradient text-white font-semibold' : 'text-white/60'
            }`}
          >
            <KeyRound className="h-3 w-3" /> Password
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('otp'); setError(null); }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              authMode === 'otp' ? 'bg-love-gradient text-white font-semibold' : 'text-white/60'
            }`}
          >
            <Mail className="h-3 w-3" /> Email Code
          </button>
        </div>

        {error && (
          <p role="alert" className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </p>
        )}

        {success && (
          <p role="status" className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300">
            {success}
          </p>
        )}

        {/* Password Mode */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              className={inputCls}
              type="email"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setPassword('OnlyUs@2026!')}
                className="text-rose-glow hover:underline"
              >
                Use Default Password
              </button>
              <Link to="/forgot" className="text-white/60 hover:text-white">
                Forgot password?
              </Link>
            </div>

            <button className={btnCls} disabled={busy}>
              {busy ? 'Signing in…' : `Sign in as ${PARTNERS.find((p) => p.role === selectedPartner)?.name}`}
            </button>
          </form>
        )}

        {/* OTP Mode */}
        {authMode === 'otp' && (
          <div className="space-y-3">
            <input
              className={inputCls}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {!otpSent ? (
              <button type="button" onClick={handleSendOtp} className={btnCls} disabled={busy}>
                {busy ? 'Sending Code…' : 'Send 6-Digit Login Code'}
              </button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <input
                  className={`${inputCls} text-center font-mono text-lg tracking-widest`}
                  type="text"
                  pattern="[0-9A-Za-z]{6}"
                  maxLength={8}
                  placeholder="123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  required
                  autoFocus
                />
                <button className={btnCls} disabled={busy}>
                  {busy ? 'Verifying…' : 'Verify Code & Enter'}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-xs text-white/60 hover:text-white underline"
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </AuthShell>
  );
}
