import { AnimatePresence, motion } from 'framer-motion';

const PARTICLES = ['❤️', '💖', '✨', '💜', '🦋', '🌸', '💘'];

export default function LoveStormOverlay({ burstKey }: { burstKey: number }) {
  if (burstKey === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {Array.from({ length: 18 }).map((_, i) => {
          const left = 6 + ((i * 19) % 88);
          const delay = (i % 6) * 0.06;
          const drift = ((i % 2 === 0 ? 1 : -1) * (18 + (i % 4) * 14));
          const emoji = PARTICLES[i % PARTICLES.length];
          return (
            <motion.div
              key={`${burstKey}-${i}`}
              initial={{ opacity: 0, y: '92vh', x: 0, scale: 0.5, rotate: -15 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: ['90vh', '45vh', '10vh'],
                x: [0, drift, drift * 0.5],
                scale: [0.6, 1.35, 0.9],
                rotate: [0, i % 2 === 0 ? 22 : -22],
              }}
              transition={{ duration: 1.9 + (i % 3) * 0.25, delay, ease: 'easeOut' }}
              style={{ left: `${left}%` }}
              className="absolute text-2xl drop-shadow-[0_0_12px_rgba(255,77,141,0.75)]"
            >
              {emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
