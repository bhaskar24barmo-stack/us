import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NetworkStatusPill() {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="mx-3 mt-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] flex items-center justify-center gap-1.5"
        >
          <WifiOff className="h-3.5 w-3.5" /> Offline Mode • Changes saved locally
        </motion.div>
      )}
    </AnimatePresence>
  );
}
