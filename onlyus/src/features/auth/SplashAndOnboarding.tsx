import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import FloatingHearts from '@/components/FloatingHearts';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRole } from '@/types/models';

type Stage = 'splash' | 'welcome' | 'login' | 'setup' | 'permissions';

const ACCENT_COLORS = ['#ff4d8d', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e'];

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

  const [stage, setStage] = useState<Stage>(() => {
    if (currentUserRole && !onboarded) return 'setup';
    return 'splash';
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUserRole ?? 'me');
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
  const [codeInput, setCodeInput] = useState(pairCode);

  useEffect(() => {
    if (stage !== 'splash') return;
    const t = setTimeout(() => setStage('welcome'), 1600);
    return () => clearTimeout(t);
  }, [stage]);

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
              Your private space for instant snaps, voice notes, HD video calls, stories, and real-time presence.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-white/80">
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">💬 Private Chat</div>
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">📸 Live Camera</div>
              <div className="glass rounded-2xl px-2 py-2.5 whitespace-nowrap">✨ Moments</div>
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
            className="relative z-10 w-full max-w-md glass rounded-[32px] p-7 shadow-glass"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Choose Profile</h2>
              <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                2 / 2 Linked
              </span>
            </div>

            <div className="space-y-3">
              {(['me', 'partner'] as UserRole[]).map((role) => {
                const p = profiles[role];
                return (
                  <motion.button
                    key={role}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectProfile(role)}
                    className="w-full glass rounded-2xl p-4 flex items-center gap-4 text-left hover:border-rose-glow/50 transition-all"
                  >
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-glow-pink shrink-0"
                      style={{ background: `linear-gradient(135deg, ${p.accent_color}, #8b5cf6)` }}
                    >
                      {p.avatar_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{p.display_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/75">
                          {role === 'me' ? 'Bhaskar' : 'Purvika'}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 truncate mt-0.5">{p.bio}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/50" />
                  </motion.button>
                );
              })}
            </div>
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
                    className={`h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      emojiInput === em ? 'bg-love-gradient shadow-glow-pink scale-110' : 'glass'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Your Name</label>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm outline-none focus:border-rose-glow"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Partner’s Name</label>
                <input
                  value={partnerNameInput}
                  onChange={(e) => setPartnerNameInput(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm outline-none focus:border-rose-glow"
                  placeholder="Partner's name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Bio</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                rows={2}
                className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-sm outline-none focus:border-rose-glow resize-none"
                placeholder="A sweet bio..."
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1.5">Private Pairing Code (share with partner)</label>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs font-mono text-rose-soft outline-none focus:border-rose-glow"
                  placeholder="ONLYUS-849210"
                />
                <button
                  type="button"
                  onClick={() => setCodeInput(`ONLYUS-${Math.floor(100000 + Math.random() * 900000)}`)}
                  className="px-3 py-2 rounded-2xl glass text-xs text-white/80 shrink-0"
                >
                  New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Anniversary Date</label>
                <input
                  type="date"
                  value={anniversaryInput}
                  onChange={(e) => setAnniversaryInput(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Accent Colour</label>
                <div className="flex items-center gap-1.5 pt-1">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
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
