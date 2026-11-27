import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Heart, KeyRound, Mail, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import FloatingHearts from '@/components/FloatingHearts';
import { useAuth } from '@/features/auth/authStore';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRole } from '@/types/models';

type Stage = 'splash' | 'welcome' | 'login' | 'setup' | 'permissions';

const ACCENT_COLORS = ['#ff4d8d', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

const PARTNER_EMAILS: Record<UserRole, string> = {
  me: 'gnbhaskar636@gmail.com',
  partner: 'mamathakp9481@gmail.com',
};

export default function SplashAndOnboarding() {
  const {
    currentUserRole,
    onboarded,
    pairCode,
    profiles,
    signInAsRole,
    setPairCode,
    updateProfile,
    completeOnboarding,
  } = useAppStore();

  const { signIn, signInWithOtp, verifyOtp } = useAuth();

  const [stage, setStage] = useState<Stage>(() => {
    if (currentUserRole && !onboarded) return 'setup';
    return 'splash';
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUserRole ?? 'me');
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [emailInput, setEmailInput] = useState(PARTNER_EMAILS.me);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState(profiles[selectedRole].display_name);
  const [partnerNameInput, setPartnerNameInput] = useState(
    profiles[selectedRole === 'me' ? 'partner' : 'me'].display_name
  );
  const [bioInput, setBioInput] = useState(profiles[selectedRole].bio);
  const [emojiInput, setEmojiInput] = useState(profiles[selectedRole].avatar_emoji);
  const [accentInput, setAccentInput] = useState(profiles[selectedRole].accent_color || '#ff4d8d');
  const [anniversaryInput, setAnniversaryInput] = useState(
    useAppStore.getState().world.anniversaryDate || new Date().toISOString().slice(0, 10)
  );
  const [timezoneInput] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [permNotif, setPermNotif] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [codeInput] = useState(pairCode);

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = setTimeout(() => setStage('welcome'), 1600);
    return () => clearTimeout(t);
  }, [stage]);

  function handleSelectRolePill(role: UserRole) {
    setSelectedRole(role);
    setEmailInput(PARTNER_EMAILS[role]);
    setAuthError(null);
    setAuthSuccess(null);
    setOtpSent(false);
    setOtpToken('');
  }

  function handleSelectProfile(role: UserRole) {
    const other: UserRole = role === 'me' ? 'partner' : 'me';
    setSelectedRole(role);
    setNameInput(profiles[role].display_name);
    setPartnerNameInput(profiles[other].display_name);
    setBioInput(profiles[role].bio);
    setEmojiInput(profiles[role].avatar_emoji);
    signInAsRole(role);
    setStage('setup');
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    setAuthSuccess(null);

    const err = await signIn(emailInput, passwordInput);
    setAuthBusy(false);

    if (err) {
      setAuthError(err);
    } else {
      const role: UserRole = emailInput.toLowerCase().includes('gnbhaskar') ? 'me' : 'partner';
      handleSelectProfile(role);
    }
  }

  async function handleSendOtp() {
    setAuthBusy(true);
    setAuthError(null);
    setAuthSuccess(null);

    const res = await signInWithOtp(emailInput);
    setAuthBusy(false);

    if (!res.ok) {
      setAuthError(res.error ?? 'Could not send verification code.');
    } else {
      setOtpSent(true);
      setAuthSuccess(`6-digit login code sent to ${emailInput}! Check your inbox.`);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError(null);

    const res = await verifyOtp(emailInput, otpToken);
    setAuthBusy(false);

    if (!res.ok) {
      setAuthError(res.error ?? 'Invalid or expired code.');
    } else {
      const role: UserRole = emailInput.toLowerCase().includes('gnbhaskar') ? 'me' : 'partner';
      handleSelectProfile(role);
    }
  }

  function handleFinishSetup(e: React.FormEvent) {
    e.preventDefault();
    const other: UserRole = selectedRole === 'me' ? 'partner' : 'me';
    updateProfile(selectedRole, {
      display_name: nameInput.trim() || profiles[selectedRole].display_name,
      bio: bioInput.trim() || profiles[selectedRole].bio,
      avatar_emoji: emojiInput || profiles[selectedRole].avatar_emoji,
      accent_color: accentInput,
    });
    if (partnerNameInput.trim()) {
      updateProfile(other, { display_name: partnerNameInput.trim() });
    }
    if (anniversaryInput) {
      useAppStore.getState().updateWorld({ anniversaryDate: anniversaryInput });
    }
    if (codeInput.trim()) {
      setPairCode(codeInput.trim());
    }
    setStage('permissions');
  }

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-ink-950 bg-midnight-radial flex items-center justify-center p-4">
      <FloatingHearts />

      <AnimatePresence mode="wait">
        {stage === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.45 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="h-24 w-24 rounded-[28px] bg-love-gradient flex items-center justify-center shadow-glow-pink mb-6"
            >
              <Heart className="h-12 w-12 text-white fill-white" />
            </motion.div>
            <h1 className="text-4xl font-bold tracking-tight bg-love-gradient bg-clip-text text-transparent">
              ONLYUS
            </h1>
            <p className="mt-2 text-sm text-white/65 tracking-wide">Private space for two</p>
            <div className="mt-8 w-44 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: 1.9, ease: 'easeInOut' }}
                className="h-full w-full bg-love-gradient rounded-full"
              />
            </div>
          </motion.div>
        )}

        {stage === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md glass rounded-[32px] p-8 text-center shadow-glass"
          >
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-love-gradient-soft border border-rose-glow/30 flex items-center justify-center shadow-glow-pink">
              <Sparkles className="h-8 w-8 text-rose-glow" />
            </div>
            <h2 className="text-3xl font-bold bg-love-gradient bg-clip-text text-transparent">
              Welcome to ONLYUS
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Your private sanctuary for instant snaps, voice notes, HD video calls, and real-time presence.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-white/80">
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">💬 Private Chat</div>
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">📸 Live Moments</div>
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">📞 HD Calls</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStage('login')}
              className="mt-7 w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        )}

        {stage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md glass rounded-[32px] p-6 shadow-glass space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sign In</h2>
                <p className="text-xs text-white/60">Choose your profile to enter ONLYUS</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                2 Members
              </span>
            </div>

            {/* Profile Selection Pills */}
            <div className="grid grid-cols-2 gap-2.5">
              {(['me', 'partner'] as UserRole[]).map((role) => {
                const p = profiles[role];
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleSelectRolePill(role)}
                    className={`rounded-2xl p-3 flex items-center gap-2.5 text-left transition-all border ${
                      isSelected
                        ? 'bg-white/15 border-rose-glow shadow-glow-pink'
                        : 'glass border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: `linear-gradient(135deg, ${p.accent_color}, #8b5cf6)` }}
                    >
                      {p.avatar_emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{p.display_name}</div>
                      <div className="text-[10px] text-white/60 truncate">
                        {role === 'me' ? 'Bhaskar' : 'Purvika'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setAuthMode('password'); setAuthError(null); }}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                  authMode === 'password' ? 'bg-love-gradient text-white font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" /> Password
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('otp'); setAuthError(null); }}
                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                  authMode === 'otp' ? 'bg-love-gradient text-white font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email Code
              </button>
            </div>

            {authError && (
              <div role="alert" className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div role="status" className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs">
                {authSuccess}
              </div>
            )}

            {/* Password Auth Form */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-glow"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-white/60">Password</label>
                    <button
                      type="button"
                      onClick={() => setPasswordInput('OnlyUs@2026!')}
                      className="text-[10px] text-rose-glow hover:underline"
                    >
                      Use Default Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-glow"
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
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={authBusy}
                  className="w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {authBusy ? 'Signing in…' : `Sign in as ${profiles[selectedRole].display_name}`}
                </motion.button>
              </form>
            )}

            {/* Email OTP Auth Form */}
            {authMode === 'otp' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-white/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-rose-glow"
                  />
                </div>

                {!otpSent ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleSendOtp}
                    disabled={authBusy}
                    className="w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {authBusy ? 'Sending Code…' : 'Send 6-Digit Login Code'}
                  </motion.button>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-white/60 mb-1">Enter 6-Digit Code</label>
                      <input
                        type="text"
                        pattern="[0-9A-Za-z]{6}"
                        maxLength={8}
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                        placeholder="123456"
                        required
                        autoFocus
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-rose-glow text-center text-lg tracking-widest font-mono text-white focus:outline-none"
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={authBusy}
                      className="w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {authBusy ? 'Verifying…' : 'Verify Code & Enter'}
                    </motion.button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[11px] text-white/60 hover:text-white underline"
                      >
                        Resend Code
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}

        {stage === 'setup' && (
          <motion.form
            key="setup"
            onSubmit={handleFinishSetup}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md glass rounded-[32px] p-7 shadow-glass space-y-4"
          >
            <div>
              <h2 className="text-2xl font-bold">Customize Your Profile</h2>
              <p className="text-xs text-white/60 mt-1">Set how your partner sees you in ONLYUS.</p>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Avatar Icon</label>
              <div className="flex gap-2 flex-wrap">
                {['🖤', '🌙', '💖', '✨', '🦋', '🌹', '🧸', '🔥'].map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setEmojiInput(em)}
                    className={`h-10 w-10 rounded-2xl text-xl flex items-center justify-center transition-transform ${
                      emojiInput === em ? 'bg-white/20 scale-110 border border-rose-glow' : 'glass'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Your Display Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                className="w-full px-4 py-3 rounded-2xl glass text-white focus:outline-none focus:border-rose-glow text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Partner Display Name</label>
              <input
                type="text"
                value={partnerNameInput}
                onChange={(e) => setPartnerNameInput(e.target.value)}
                maxLength={24}
                className="w-full px-4 py-3 rounded-2xl glass text-white focus:outline-none focus:border-rose-glow text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Status / Bio</label>
              <input
                type="text"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                maxLength={60}
                className="w-full px-4 py-3 rounded-2xl glass text-white focus:outline-none focus:border-rose-glow text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Anniversary</label>
                <input
                  type="date"
                  value={anniversaryInput}
                  onChange={(e) => setAnniversaryInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl glass text-white text-xs focus:outline-none focus:border-rose-glow"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Accent Color</label>
                <div className="flex gap-1.5 pt-1.5">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setAccentInput(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        accentInput === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Accent ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-white/50">
              Timezone detected: <span className="text-white/80">{timezoneInput}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink"
            >
              Continue →
            </motion.button>
          </motion.form>
        )}

        {stage === 'permissions' && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md glass rounded-[32px] p-7 shadow-glass space-y-4"
          >
            <div>
              <h2 className="text-2xl font-bold">Permissions</h2>
              <p className="text-xs text-white/60 mt-1">
                ONLYUS asks for permissions only when you need them. You can enable notifications now or later.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Notifications</div>
                  <div className="text-white/55">Get notified for messages, love notes &amp; incoming calls</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof Notification !== 'undefined') {
                      const res = await Notification.requestPermission();
                      setPermNotif(res === 'granted' ? 'granted' : 'denied');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-love-gradient text-white font-semibold shrink-0"
                >
                  {permNotif === 'granted' ? 'Enabled ✓' : permNotif === 'denied' ? 'Denied' : 'Enable'}
                </button>
              </div>
              <div className="glass rounded-2xl p-3.5">
                <div className="font-semibold">Camera &amp; Microphone</div>
                <div className="text-white/55">Requested automatically when you open Camera, Voice Notes, or Calls.</div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={completeOnboarding}
              className="w-full py-3.5 rounded-2xl bg-love-gradient font-semibold text-white shadow-glow-pink"
            >
              Enter ONLYUS ❤️
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
