import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Ambient3DOrbProps {
  center?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export default function Ambient3DOrb({ center, size = 'md', pulse = false }: Ambient3DOrbProps) {
  const dims =
    size === 'lg'
      ? { box: 'h-44 w-44', core: 'h-24 w-24 text-5xl', r1: 'inset-2', r2: 'inset-0' }
      : size === 'sm'
      ? { box: 'h-24 w-24', core: 'h-14 w-14 text-2xl', r1: 'inset-1', r2: 'inset-0' }
      : { box: 'h-36 w-36', core: 'h-20 w-20 text-4xl', r1: 'inset-1.5', r2: 'inset-0' };

  return (
    <div
      className={`relative ${dims.box} flex items-center justify-center select-none`}
      style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
    >
      {/* Ambient 3D Glow */}
      <motion.div
        animate={pulse ? { scale: [1, 1.25, 1], opacity: [0.35, 0.7, 0.35] } : { opacity: 0.4 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-3 rounded-full bg-love-gradient blur-2xl pointer-events-none"
      />

      {/* Orbital Ring 1 (Tilted X/Y) */}
      <motion.div
        animate={{ rotateZ: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        className={`absolute ${dims.r1} rounded-full border border-rose-glow/45 pointer-events-none`}
        style={{ transform: 'rotateX(66deg) rotateY(18deg)' }}
      >
        <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-rose-glow shadow-glow-pink" />
      </motion.div>

      {/* Orbital Ring 2 (Counter-tilted) */}
      <motion.div
        animate={{ rotateZ: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className={`absolute ${dims.r2} rounded-full border border-violet-glow/40 pointer-events-none`}
        style={{ transform: 'rotateX(70deg) rotateY(-24deg)' }}
      >
        <span className="absolute -bottom-1 left-1/2 h-2 w-2 rounded-full bg-violet-glow" />
      </motion.div>

      {/* 3D Floating Core */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className={`relative ${dims.core} rounded-[28px] bg-love-gradient flex items-center justify-center shadow-glow-pink border border-white/30`}
        style={{
          boxShadow:
            '0 14px 36px rgba(255, 77, 141, 0.38), inset 0 2px 6px rgba(255, 255, 255, 0.38)',
        }}
      >
        {center}
      </motion.div>
    </div>
  );
}
