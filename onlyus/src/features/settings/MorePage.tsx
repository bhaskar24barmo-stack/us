import {
  Archive,
  Bell,
  Bug,
  Camera,
  CheckSquare,
  ChevronRight,
  Lock,
  NotebookPen,
  Sparkles,
  Timer,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AvatarBubble from '@/components/AvatarBubble';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import { exportCoupleDataToZip } from '@/services/backupExport';
import WhatsNewSheet from '@/components/WhatsNewSheet';

export default function MorePage({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const { currentUserRole, profiles, settings, messages, calls } = useAppStore();
  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const [diagCopied, setDiagCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportCoupleDataToZip(useAppStore.getState());
    } catch (err) {
      console.warn('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }

  function copyDiagnosticReport() {
    const bundle = {
      app: 'ONLYUS',
      timestamp: new Date().toISOString(),
      platform: navigator.userAgent,
      supabaseConfigured: isSupabaseConfigured,
      theme: settings.themeMode,
      messageCount: messages.length,
      callCount: calls.length,
      online: navigator.onLine,
    };
    void navigator.clipboard?.writeText(JSON.stringify(bundle, null, 2));
    setDiagCopied(true);
    setTimeout(() => setDiagCopied(false), 2200);
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-5 no-scrollbar">
      <h1 className="text-2xl font-bold">More</h1>

      <Link
        to="/profile"
        className="glass rounded-3xl p-4 flex items-center justify-between gap-3 border border-white/15"
      >
        <div className="flex items-center gap-3 min-w-0">
          <AvatarBubble profile={me} size="md" showOnline />
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{me.display_name}</div>
            <div className="text-xs text-white/55 truncate">Profile, Theme &amp; Wallpaper</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-white/45 shrink-0" />
      </Link>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-white/50 font-semibold px-1">
          Our Space
        </div>
        <div className="glass rounded-3xl divide-y divide-white/10 overflow-hidden">
          <Link to="/camera" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <Camera className="h-4 w-4 text-rose-glow" /> Camera &amp; Filters
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link to="/countdowns" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <Timer className="h-4 w-4 text-amber-300" /> Countdowns &amp; Dates
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link to="/bucket-list" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <CheckSquare className="h-4 w-4 text-emerald-300" /> Shared Bucket List
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
          <Link to="/journal" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <NotebookPen className="h-4 w-4 text-violet-300" /> Journal &amp; Love Letters
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-white/50 font-semibold px-1">
          Preferences &amp; Privacy
        </div>
        <div className="glass rounded-3xl divide-y divide-white/10 overflow-hidden">
          <Link to="/profile" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <User className="h-4 w-4 text-rose-soft" /> Profile &amp; Appearance
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5 text-left"
          >
            <span className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-sky-300" /> Notifications &amp; Quiet Hours
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
          <Link to="/settings/security" className="px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5">
            <span className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-emerald-400" /> App Lock, PIN &amp; Devices
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5 text-left disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <Archive className="h-4 w-4 text-pink-400" /> Backup &amp; Export Data (ZIP)
            </span>
            <span className="text-xs text-rose-soft font-medium">
              {isExporting ? 'Packaging...' : 'Export'}
            </span>
          </button>
          <button
            type="button"
            onClick={copyDiagnosticReport}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5 text-left"
          >
            <span className="flex items-center gap-3">
              <Bug className="h-4 w-4 text-white/70" /> Report a Problem (Copy Diagnostics)
            </span>
            <span className="text-xs text-rose-soft">{diagCopied ? 'Copied ✓' : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm hover:bg-white/5 text-left"
          >
            <span className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-rose-glow" /> What&apos;s New in ONLYUS v2
            </span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        </div>
      </div>

      <WhatsNewSheet forceOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
