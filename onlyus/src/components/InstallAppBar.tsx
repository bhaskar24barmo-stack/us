import { AnimatePresence, motion } from 'framer-motion';
import { Download, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'onlyus.install.dismissed';

export default function InstallAppBar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed || isStandalone) return null;
  if (!deferredPrompt && !isIOS) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage error
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        className="relative z-30 mx-3 mt-2 mb-1 glass-strong rounded-2xl px-3 py-2 border border-rose-glow/35 shadow-glow-pink flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-love-gradient flex items-center justify-center shrink-0">
            <Smartphone className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">Install ONLYUS ❤️</div>
            <div className="text-[10px] text-white/65 truncate">
              {deferredPrompt ? 'Add app to your home screen' : 'Tap Share → Add to Home Screen'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="px-2.5 py-1 rounded-xl bg-love-gradient text-[11px] font-semibold text-white flex items-center gap-1 shadow-glow-pink"
            >
              <Download className="h-3 w-3" /> Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install bar"
            className="h-7 w-7 rounded-full glass flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
