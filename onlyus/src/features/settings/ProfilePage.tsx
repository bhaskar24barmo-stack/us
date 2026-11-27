import {
  ArrowLeftRight,
  Bell,
  Download,
  Lock,
  LogOut,
  Palette,
  RotateCcw,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Upload,
  Volume2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarBubble from '@/components/AvatarBubble';
import TiltCard from '@/components/TiltCard';
import { useAppStore } from '@/stores/useAppStore';
import { useAuth } from '@/features/auth/authStore';
import type { ChatThemeId, WallpaperId } from '@/types/models';

const CHAT_THEMES: Array<{ id: ChatThemeId; label: string; colors: string }> = [
  { id: 'midnight-purple', label: 'Midnight Purple', colors: 'from-violet-600 to-indigo-700' },
  { id: 'rose-pink', label: 'Rose Pink', colors: 'from-[#ff4d8d] to-[#8b5cf6]' },
  { id: 'ocean-blue', label: 'Ocean Blue', colors: 'from-sky-500 to-indigo-600' },
  { id: 'amoled-black', label: 'AMOLED Black', colors: 'from-zinc-800 to-zinc-950' },
  { id: 'sunset', label: 'Sunset', colors: 'from-rose-500 to-amber-500' },
  { id: 'lavender-dream', label: 'Lavender Dream', colors: 'from-purple-400 to-fuchsia-500' },
];

const WALLPAPERS: Array<{ id: WallpaperId; label: string }> = [
  { id: 'constellation', label: 'Constellation' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'hearts', label: 'Floating Hearts' },
  { id: 'minimal', label: 'Minimal' },
];

export default function ProfilePage({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const {
    currentUserRole,
    pairCode,
    profiles,
    settings,
    setPairCode,
    updateProfile,
    updateSettings,
    signInAsRole,
    signOutDemo,
    resetDemoData,
  } = useAppStore();
  const [codeDraft, setCodeDraft] = useState(pairCode);

  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const [name, setName] = useState(me.display_name);
  const [bio, setBio] = useState(me.bio);
  const [statusText, setStatusText] = useState(me.status_text);
  const [savedToast, setSavedToast] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
        updateProfile(role, { avatar_path: dataUrl });
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 1800);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function exportBackup() {
    const raw = localStorage.getItem('onlyus.v4') || '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onlyus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('Backup exported ✓');
    setTimeout(() => setBackupMsg(null), 2200);
  }

  function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        JSON.parse(text);
        localStorage.setItem('onlyus.v4', text);
        window.location.reload();
      } catch {
        setBackupMsg('Invalid backup JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateProfile(role, {
      display_name: name.trim() || me.display_name,
      bio: bio.trim(),
      status_text: statusText.trim(),
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  }

  function switchRole() {
    const next = role === 'me' ? 'partner' : 'me';
    signInAsRole(next);
    const p = profiles[next];
    setName(p.display_name);
    setBio(p.bio);
    setStatusText(p.status_text);
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-5 no-scrollbar">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold truncate">Profile &amp; Settings</h1>
        <button
          onClick={switchRole}
          className="px-3 py-1.5 rounded-full glass text-xs flex items-center gap-1.5 text-rose-soft shrink-0 whitespace-nowrap"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> Switch to {role === 'me' ? 'Purvika' : 'Bhaskar'}
        </button>
      </div>

      {/* Two-Person Friend Link & Live Presence */}
      <div className="glass rounded-3xl p-4 space-y-2.5 border border-white/15">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-soft">
            Private Friends (2 / 2)
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Open-Source Presence
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['me', 'partner'] as const).map((r) => {
            const p = profiles[r];
            return (
              <div key={r} className="rounded-2xl bg-white/5 border border-white/10 p-2.5 flex items-center gap-2.5">
                <AvatarBubble profile={p} size="sm" showOnline />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{p.display_name}</div>
                  <div className="text-[10px] text-white/55 truncate">
                    {p.online ? 'online' : 'offline'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            value={codeDraft}
            onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
            placeholder="ONLYUS-XXXXXX"
            className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-1.5 text-xs font-mono text-rose-soft outline-none focus:border-rose-glow min-w-0"
          />
          <button
            type="button"
            onClick={() => {
              setPairCode(codeDraft);
              setBackupMsg('Pair code linked ✓');
              setTimeout(() => setBackupMsg(null), 2000);
            }}
            className="text-[11px] px-3 py-1.5 rounded-xl bg-love-gradient text-white font-semibold shrink-0"
          >
            Connect
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(pairCode);
              setBackupMsg('Code copied ✓');
              setTimeout(() => setBackupMsg(null), 2000);
            }}
            className="text-[11px] px-2.5 py-1.5 rounded-xl glass text-white/80 shrink-0"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <TiltCard>
        <form onSubmit={saveProfile} className="glass rounded-3xl p-5 space-y-3.5">
        <div className="flex items-center gap-4">
          <AvatarBubble profile={me} size="lg" showOnline />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg truncate">{me.display_name}</div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className={`h-2 w-2 rounded-full ${me.online ? 'bg-emerald-400' : 'bg-white/30'}`} />
              <button
                type="button"
                onClick={() => updateProfile(role, { online: !me.online })}
                className="underline"
              >
                {me.online ? 'Online' : 'Appear Away'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() =>
                  updateProfile(role, {
                    avatar_path: role === 'me' ? '/avatars/bhaskar.png' : '/avatars/purvika.png',
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  me.avatar_path?.includes(role === 'me' ? 'bhaskar' : 'purvika')
                    ? 'bg-love-gradient text-white shadow-glow-pink'
                    : 'bg-white/10 hover:bg-white/15 text-white/90 border border-white/15'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-rose-soft" /> 3D Avatar
              </button>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Photo
              </button>
              {me.avatar_path && (
                <button
                  type="button"
                  onClick={() => updateProfile(role, { avatar_path: undefined })}
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/60"
                >
                  Reset to Emoji
                </button>
              )}
            </div>

            {/* Animated Aura Ring Selector */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-rose-soft" />
                Animated Aura Ring
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'heartbeat', label: '❤️ Pulse' },
                  { id: 'golden', label: '✨ Golden' },
                  { id: 'flame', label: '🔥 Streak' },
                  { id: 'rose', label: '🌸 Bloom' },
                  { id: 'none', label: 'Minimal' },
                ].map((ring) => (
                  <button
                    key={ring.id}
                    type="button"
                    onClick={() => updateProfile(role, { aura_ring: ring.id as 'heartbeat' | 'golden' | 'flame' | 'rose' | 'none' })}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      (me.aura_ring ?? 'heartbeat') === ring.id
                        ? 'bg-love-gradient text-white border-rose-glow shadow-glow-pink'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    {ring.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm outline-none focus:border-rose-glow"
          />
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value)}
            placeholder="Status text"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            placeholder="Bio"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold shadow-glow-pink"
        >
          {savedToast ? 'Profile Saved ✓' : 'Save Profile'}
        </button>
        </form>
      </TiltCard>

      {/* Theme & Wallpaper */}
      <div className="glass rounded-3xl p-4 space-y-3.5">
        <div>
          <div className="text-xs font-semibold flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-400" /> Theme Mode
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-wider">
              {settings.themeMode === 'cream' ? 'Warm Cream' : settings.themeMode === 'auto' ? 'System Auto' : 'Midnight Dark'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
            {(
              [
                { id: 'dark', label: 'Dark', icon: '🌙' },
                { id: 'cream', label: 'Warm Cream', icon: '🍦' },
                { id: 'auto', label: 'Auto', icon: '📱' },
              ] as const
            ).map((t) => {
              const active = (settings.themeMode ?? 'dark') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updateSettings({ themeMode: t.id })}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    active
                      ? 'bg-love-gradient text-white shadow-glow-pink'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-rose-glow" /> Chat Bubble Theme
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CHAT_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateSettings({ chatTheme: t.id })}
                className={`p-2.5 rounded-2xl text-left text-xs flex items-center gap-2 border ${
                  settings.chatTheme === t.id ? 'border-rose-glow bg-white/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <span className={`h-4 w-4 rounded-full bg-gradient-to-br ${t.colors}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Wallpaper</div>
          <div className="flex gap-2 flex-wrap">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                onClick={() => updateSettings({ wallpaper: w.id })}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  settings.wallpaper === w.id ? 'bg-love-gradient text-white' : 'glass text-white/70'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sound, Privacy & Security */}
      <div className="glass rounded-3xl p-4 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-rose-glow" /> Sound Effects
          </span>
          <input
            type="checkbox"
            checked={settings.soundEffects}
            onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
            className="accent-pink-500 h-4 w-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-glow" /> Read Receipts
          </span>
          <input
            type="checkbox"
            checked={settings.readReceipts}
            onChange={(e) => updateSettings({ readReceipts: e.target.checked })}
            className="accent-pink-500 h-4 w-4"
          />
        </div>
        <button
          onClick={onOpenNotifications}
          className="w-full py-2.5 rounded-2xl glass flex items-center justify-between px-3.5"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-rose-soft" /> Notification Preferences
          </span>
          <span className="text-white/50">Open →</span>
        </button>
        <Link
          to="/settings/security"
          className="w-full py-2.5 rounded-2xl glass flex items-center justify-between px-3.5"
        >
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" /> App Lock &amp; PIN
          </span>
          <span className="text-white/50">Manage →</span>
        </Link>
      </div>

      {/* PWA Install Instructions & Reset */}
      <div className="glass rounded-3xl p-4 space-y-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Smartphone className="h-4 w-4 text-rose-glow" /> Install on Phone (PWA)
        </div>
        <p className="text-white/65 leading-relaxed">
          <strong>iPhone Safari:</strong> Tap Share → “Add to Home Screen”.<br />
          <strong>Android Chrome:</strong> Tap Menu (⋮) → “Install App”.
        </p>
        <div className="pt-2 flex gap-2">
          <button
            onClick={exportBackup}
            className="flex-1 py-2.5 rounded-2xl glass text-white/80 flex items-center justify-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export Backup
          </button>
          <input ref={importRef} type="file" accept="application/json" onChange={importBackup} className="hidden" />
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 py-2.5 rounded-2xl glass text-white/80 flex items-center justify-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Import Backup
          </button>
        </div>
        {backupMsg && <p className="text-[11px] text-rose-soft text-center">{backupMsg}</p>}
        <div className="pt-1 flex gap-2">
          <button
            onClick={resetDemoData}
            className="flex-1 py-2.5 rounded-2xl glass text-white/80 flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Local Cache
          </button>
          <button
            onClick={() => {
              signOutDemo();
              void useAuth.getState().signOut();
            }}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
