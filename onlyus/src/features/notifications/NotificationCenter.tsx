import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Eye,
  Heart,
  Image,
  Mic,
  Moon,
  Music,
  PhoneMissed,
  Volume2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  playSoftChime,
  triggerHeartbeatHaptic,
  requestBrowserNotificationPermission,
  type ChimeKind,
} from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

const CHIME_CHOICES: Array<{ id: ChimeKind; label: string; desc: string }> = [
  { id: 'harp', label: 'Harp Chime', desc: '432Hz warmth' },
  { id: 'musicbox', label: 'Music Box', desc: 'Glassy romantic' },
  { id: 'heartbeat', label: 'Heartbeat', desc: 'Deep pulse' },
  { id: 'whisper', label: 'Soft Rain', desc: 'Gentle droplet' },
];

export function ToastStack() {
  const navigate = useNavigate();
  const { toasts, dismissToast } = useAppStore();

  return (
    <div className="absolute top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94 }}
            onClick={() => {
              dismissToast(t.id);
              navigate(t.kind === 'missed_call' ? '/calls' : '/chats');
            }}
            className="w-full max-w-[390px] bg-[#161024]/95 backdrop-blur-xl rounded-2xl px-3.5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] border border-rose-glow/30 pointer-events-auto cursor-pointer flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-full bg-love-gradient flex items-center justify-center shrink-0 shadow-glow-pink">
              <Heart className="h-4 w-4 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate text-white">{t.title}</span>
                <span className="text-[10px] text-white/45 shrink-0">now</span>
              </div>
              <div className="text-[11px] text-white/75 truncate">{t.body}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(t.id);
                navigate('/chats');
              }}
              className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-semibold text-rose-soft hover:bg-white/20 shrink-0"
            >
              Reply ❤️
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const {
    notifications,
    notifPrefs,
    markNotifRead,
    markAllNotifsRead,
    clearAllNotifications,
    updateNotifPrefs,
  } = useAppStore();

  const [activeChime, setActiveChime] = useState<ChimeKind>('harp');

  async function enableBrowserNotifs() {
    const res = await requestBrowserNotificationPermission();
    updateNotifPrefs({ browserPush: res === 'granted' });
  }

  function testChime(kind: ChimeKind) {
    setActiveChime(kind);
    playSoftChime(kind);
    triggerHeartbeatHaptic();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full glass-strong border-l border-white/15 p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-rose-glow" />
                <h2 className="text-lg font-bold">Notifications</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotifsRead}
                  className="text-xs text-rose-soft flex items-center gap-1 px-2.5 py-1 rounded-full glass"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Read all
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-white/70 hover:text-white px-2.5 py-1 rounded-full glass"
                >
                  Clear
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="glass rounded-2xl p-3.5 space-y-3 text-xs">
              {[
                {
                  label: 'Notification Sounds',
                  icon: <Volume2 className="h-4 w-4 text-rose-glow" />,
                  checked: notifPrefs.sound,
                  onToggle: () => updateNotifPrefs({ sound: !notifPrefs.sound }),
                },
                {
                  label: `Quiet Hours (${notifPrefs.quietStart}–${notifPrefs.quietEnd})`,
                  icon: <Moon className="h-4 w-4 text-violet-glow" />,
                  checked: notifPrefs.quietHoursEnabled,
                  onToggle: () => updateNotifPrefs({ quietHoursEnabled: !notifPrefs.quietHoursEnabled }),
                },
                {
                  label: 'Show Message Previews',
                  icon: <Eye className="h-4 w-4 text-sky-300" />,
                  checked: notifPrefs.showPreview,
                  onToggle: () => updateNotifPrefs({ showPreview: !notifPrefs.showPreview }),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {item.icon} {item.label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.checked}
                    aria-label={item.label}
                    onClick={item.onToggle}
                    className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                      item.checked ? 'bg-love-gradient justify-end' : 'bg-white/15 justify-start'
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              ))}

              {/* Romantic Chime Selector */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-semibold text-rose-soft flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" /> Romantic Alert Sounds
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CHIME_CHOICES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => testChime(c.id)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        activeChime === c.id
                          ? 'bg-love-gradient-soft border-rose-glow text-white shadow-glow-pink'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">{c.label}</div>
                      <div className="text-[9px] text-white/50">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={enableBrowserNotifs}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-medium"
              >
                {notifPrefs.browserPush ? 'Push Notifications Enabled ✓' : 'Enable Mobile Push Alerts'}
              </button>
            </div>

            {/* List */}
            <div className="space-y-2 flex-1">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markNotifRead(n.id);
                    if (n.action_route) {
                      navigate(n.action_route);
                      onClose();
                    }
                  }}
                  className={`w-full text-left rounded-2xl p-3 flex items-start gap-3 transition-colors ${
                    n.read ? 'glass opacity-70' : 'bg-love-gradient-soft border border-rose-glow/30'
                  }`}
                >
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    {n.kind === 'missed_call' ? (
                      <PhoneMissed className="h-4 w-4 text-rose-400" />
                    ) : n.kind === 'photo' ? (
                      <Image className="h-4 w-4 text-violet-300" />
                    ) : n.kind === 'voice' ? (
                      <Mic className="h-4 w-4 text-sky-300" />
                    ) : (
                      <Heart className="h-4 w-4 text-rose-glow fill-rose-glow" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{n.title}</div>
                    <p className="text-xs text-white/70 truncate">{n.body}</p>
                    <span className="text-[10px] text-white/45">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
