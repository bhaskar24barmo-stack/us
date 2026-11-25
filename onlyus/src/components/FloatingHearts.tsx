import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';

const HEARTS = [
  { id: 1, left: '6%', size: 14, delay: 0, dur: 9, emoji: '♥' },
  { id: 2, left: '18%', size: 10, delay: 2.1, dur: 11, emoji: '♥' },
  { id: 3, left: '32%', size: 16, delay: 1.2, dur: 10, emoji: '✦' },
  { id: 4, left: '45%', size: 12, delay: 3.4, dur: 12, emoji: '♥' },
  { id: 5, left: '58%', size: 15, delay: 0.8, dur: 9.5, emoji: '♥' },
  { id: 6, left: '72%', size: 11, delay: 2.8, dur: 11.5, emoji: '✦' },
  { id: 7, left: '85%', size: 13, delay: 4.2, dur: 10.5, emoji: '♥' },
  { id: 8, left: '94%', size: 9, delay: 5.0, dur: 12.5, emoji: '♥' },
];

export default function FloatingHearts({ density = 'normal' }: { density?: 'subtle' | 'normal' }) {
  const sysReduced = useReducedMotion();
  const override = useAppStore((s) => s.settings.reducedMotionOverride);
  if (sysReduced || override) return null;

  const list = density === 'subtle' ? HEARTS.slice(0, 4) : HEARTS;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {list.map((h) => (
        <motion.span
          key={h.id}
          initial={{ y: '108vh', opacity: 0, scale: 0.6 }}
          animate={{
            y: '-10vh',
            opacity: [0, density === 'subtle' ? 0.18 : 0.35, density === 'subtle' ? 0.14 : 0.25, 0],
            scale: [0.6, 1.1, 0.9, 0.7],
            x: [0, 18, -14, 8, 0],
          }}
          transition={{
            duration: h.dur,
            delay: h.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ left: h.left, fontSize: h.size }}
          className="absolute select-none text-rose-glow drop-shadow-[0_0_10px_rgba(255,77,141,0.45)]"
        >
          {h.emoji}
        </motion.span>
      ))}
    </div>
  );
}
