import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Message } from '@/types/models';

interface SnapViewModalProps {
  snap: Message | null;
  partnerName: string;
  partnerEmoji: string;
  onClose: () => void;
  onSaveToMemories?: (snap: Message) => void;
  onDoubleTapHeart?: (snapId: string) => void;
}

export default function SnapViewModal({
  snap,
  partnerName,
  partnerEmoji,
  onClose,
  onSaveToMemories,
  onDoubleTapHeart,
}: SnapViewModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [heartAnim, setHeartAnim] = useState(false);

  useEffect(() => {
    if (!snap) return;
    setSecondsLeft(10);

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [snap, onClose]);

  if (!snap || !snap.media) return null;

  const isVideo = snap.kind === 'video' || snap.media.type === 'video';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none touch-none"
        onDoubleClick={() => {
          setHeartAnim(true);
          onDoubleTapHeart?.(snap.id);
          setTimeout(() => setHeartAnim(false), 800);
        }}
      >
        {/* Top Snapchat Header & Countdown Ring */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-love-gradient flex items-center justify-center text-sm shadow-glow-pink border border-white/20">
              {partnerEmoji || '💖'}
            </div>
            <div>
              <div className="text-white text-sm font-bold leading-tight">{partnerName}</div>
              <div className="text-white/70 text-[11px]">Snap • Tap & hold to pause</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Snapchat Circular Timer */}
            <div className="relative h-9 w-9 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#ff4d8d"
                  strokeWidth="3"
                  strokeDasharray={88}
                  strokeDashoffset={88 - (88 * secondsLeft) / 10}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute font-bold text-xs text-white">{secondsLeft}</span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Snap"
              className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
          {isVideo ? (
            <video
              src={snap.media.url}
              className="max-h-full max-w-full object-contain"
              autoPlay
              playsInline
              loop
            />
          ) : (
            <img
              src={snap.media.url}
              alt={snap.media.caption || 'Snap'}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {/* Heart on double-tap */}
          {heartAnim && (
            <motion.div
              initial={{ scale: 0.3, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0, y: -40 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-7xl z-30"
            >
              ❤️
            </motion.div>
          )}
        </div>

        {/* Bottom Bar: Caption & Quick Actions */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {snap.media.caption ? (
              <div className="bg-black/55 backdrop-blur-md rounded-2xl px-3.5 py-2 text-white text-xs font-medium border border-white/10 max-w-xs truncate">
                {snap.media.caption}
              </div>
            ) : (
              <div className="text-white/60 text-xs">Double-tap to send ❤️</div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onSaveToMemories && (
              <button
                type="button"
                onClick={() => onSaveToMemories(snap)}
                className="h-10 px-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center gap-1.5 text-xs font-semibold"
              >
                <BookmarkPlus className="h-4 w-4" /> Save
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHeartAnim(true);
                onDoubleTapHeart?.(snap.id);
                setTimeout(() => setHeartAnim(false), 800);
              }}
              className="h-10 w-10 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center shadow-glow-pink"
            >
              <Heart className="h-5 w-5 fill-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
