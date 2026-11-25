import {
  ArrowLeftRight,
  Bell,
  Download,
  Lock,
  LogOut,
  Moon,
  Palette,
  RotateCcw,
  Shield,
  Smartphone,
  Sun,
  Upload,
  Volume2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '@/components/TiltCard';
import { useAppStore } from '@/stores/useAppStore';
import type { ChatThemeId, WallpaperId } from '@/types/models';

const CHAT_THEMES: Array<{ id: ChatThemeId; label: string; colors: string }> = [
  { id: 'midnight-rose', label: 'Midnight Rose', colors: 'from-[#ff4d8d] to-[#8b5cf6]' },
  { id: 'electric-violet', label: 'Electric Violet', colors: 'from-violet-600 to-indigo-600' },
  { id: 'aurora-velvet', label: 'Aurora Velvet', colors: 'from-fuchsia-600 to-purple-700' },
  { id: 'sunset-blush', label: 'Sunset Blush', colors: 'from-rose-500 to-amber-500' },
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
    profiles,
    settings,
    updateProfile,
    updateSettings,
    signInAsRole,
    signOutDemo,
    resetDemoData,
  } = useAppStore();

  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const [name, setName] = useState(me.display_name);
  const [bio, setBio] = useState(me.bio);
  const [statusText, setStatusText] = useState(me.status_text);
  const [savedToast, setSavedToast] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  function exportBackup() {
    const raw = localStorage.getItem('onlyus.prototype.v1') || '{}';
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
        localStorage.setItem('onlyus.prototype.v1', text);
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
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-5 no-scrollbar">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold truncate">Profile &amp; Settings</h1>
        <button
          onClick={switchRole}
          className="px-3 py-1.5 rounded-full glass text-xs flex items-center gap-1.5 text-rose-soft shrink-0 whitespace-nowrap"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> Switch to {role === 'me' ? 'Girlfriend' : 'Me'}
        </button>
      </div>

      {/* Profile Card */}
      <TiltCard>
        <form onSubmit={saveProfile} className="glass rounded-3xl p-5 space-y-3.5">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-glow-pink shrink-0"
            style={{ background: `linear-gradient(135deg, ${me.accent_color}, #8b5cf6)` }}
          >
            {me.avatar_emoji}
          </div>
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
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold flex items-center gap-2">
            {settings.themeMode === 'dark' ? <Moon className="h-4 w-4 text-violet-glow" /> : <Sun className="h-4 w-4 text-amber-400" />}
            Appearance Mode
          </span>
          <button
            onClick={() => updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' })}
            className="px-3 py-1 rounded-full glass text-xs"
          >
            {settings.themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </button>
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
            <Lock className="h-4 w-4 text-emerald-400" /> App Lock &amp; PIN (Local Demo)
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
            <RotateCcw className="h-3.5 w-3.5" /> Reset Demo Data
          </button>
          <button
            onClick={signOutDemo}
            className="flex-1 py-2.5 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Switch Login
          </button>
        </div>
      </div>
    </div>
  );
}
