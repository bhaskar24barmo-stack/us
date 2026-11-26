import { AnimatePresence, motion } from 'framer-motion';

interface SnapPeekingAvatarProps {
  name: string;
  emoji: string;
  online: boolean;
  typing: boolean;
  onTap?: () => void;
}

/**
 * Snapchat-style mini peeking avatar that pops up smoothly when your partner
 * is online or typing in the chat.
 */
export default function SnapPeekingAvatar({
  name,
  emoji,
  online,
  typing,
  onTap,
}: SnapPeekingAvatarProps) {
  if (!online && !typing) return null;

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={onTap}
        initial={{ y: 18, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.85 }}
        whileTap={{ scale: 0.94 }}
        className="inline-flex items-center gap-2 self-start rounded-full glass-strong px-2.5 py-1 border border-white/15 shadow-glass"
      >
        <motion.span
          animate={typing ? { y: [0, -3, 0], rotate: [-4, 4, -4] } : { y: [0, -2, 0] }}
          transition={{ duration: typing ? 0.7 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-6 w-6 rounded-full bg-love-gradient flex items-center justify-center text-xs shadow-glow-pink"
        >
          {emoji}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-ink-950" />
        </motion.span>
        <span className="text-[11px] font-medium text-white/85">
          {typing ? `${name} is typing…` : `${name} is peeking 👀`}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
