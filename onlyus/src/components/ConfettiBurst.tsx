import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

const PIECES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 320,
  y: -120 - Math.random() * 200,
  rot: Math.random() * 360,
  emoji: ['❤️', '💖', '✨', '💜', '🔥', '💘'][i % 6],
}));

export default function ConfettiBurst() {
  const trigger = useAppStore((s) => s.celebrationTrigger);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    const t0 = setTimeout(() => setVisible(true), 0);
    const t1 = setTimeout(() => setVisible(false), 2000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: 0, y: 40, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.35, rotate: p.rot }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute text-2xl select-none"
            >
              {p.emoji}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
