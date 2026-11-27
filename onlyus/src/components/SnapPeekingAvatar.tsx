import { AnimatePresence, motion } from 'framer-motion';

interface SnapPeekingAvatarProps {
  name: string;
  emoji: string;
  avatarPath?: string | null;
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
  avatarPath,
  typing,
  onTap,
}: SnapPeekingAvatarProps) {
  if (!typing) return null;

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={onTap}
        initial={{ y: 24, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="inline-flex items-center gap-2 self-start rounded-full glass-strong px-2.5 py-1 border border-rose-500/30 shadow-glow-pink backdrop-blur-md"
      >
        <motion.div
          animate={typing ? { y: [0, -3, 0], rotate: [-3, 3, -3] } : { y: [0, -2, 0] }}
          transition={{ duration: typing ? 0.6 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-7 w-7 rounded-full overflow-hidden bg-love-gradient flex items-center justify-center text-xs shadow-sm ring-1 ring-white/30 shrink-0"
        >
          {avatarPath ? (
            <img src={avatarPath} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span>{emoji}</span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-ink-950" />
        </motion.div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
          <span>{typing ? `${name} is typing` : `${name} is in chat`}</span>
          {typing ? (
            <span className="flex gap-0.5 items-center">
              <span className="h-1 w-1 rounded-full bg-rose-glow animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 rounded-full bg-rose-glow animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full bg-rose-glow animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          ) : (
            <span className="text-rose-soft text-[10px]">✨ tap for hearts</span>
          )}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
