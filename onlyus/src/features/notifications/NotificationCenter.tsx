import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Eye, Heart, Image, Mic, Moon, PhoneMissed, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestBrowserNotificationPermission } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

export function ToastStack() {
  const { toasts, dismissToast } = useAppStore();
  return (
    <div className="fixed top-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            onClick={() => dismissToast(t.id)}
            className="w-full max-w-sm glass-strong rounded-2xl px-4 py-3 shadow-glow-pink border border-rose-glow/35 pointer-events-auto cursor-pointer flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-love-gradient flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{t.title}</div>
              <div className="text-[11px] text-white/70 truncate">{t.body}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notifications, notifPrefs, markNotifRead, markAllNotifsRead, updateNotifPrefs } = useAppStore();

  async function enableBrowserNotifs() {
    const res = await requestBrowserNotificationPermission();
    updateNotifPrefs({ browserPush: res === 'granted' });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full glass-strong border-l border-white/15 p-5 flex flex-col gap-4 overflow-y-auto"
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
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="h-8 w-8 rounded-full glass flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preferences */}
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
              <button
                onClick={enableBrowserNotifs}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-medium"
              >
                {notifPrefs.browserPush ? 'Browser Notifications Enabled ✓' : 'Enable Browser Notifications'}
              </button>
              <p className="text-[10px] text-white/45 leading-snug">
                In-app alerts work everywhere. Background push notifications require a push backend &amp; service worker in production.
              </p>
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
