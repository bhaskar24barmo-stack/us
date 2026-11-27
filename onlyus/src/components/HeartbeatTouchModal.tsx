import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Sparkles, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HeartbeatTouchModal({ open, onClose }: Props) {
  const { currentUserRole, pairCode, profiles } = useAppStore();
  const role = currentUserRole ?? 'me';
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const [myHolding, setMyHolding] = useState(false);
  const [partnerHolding, setPartnerHolding] = useState(false);
  const pulseIntervalRef = useRef<number | null>(null);

  // Broadcast channel for instantaneous touch synchronization
  useEffect(() => {
    if (!open || !supabase) return;
    const topic = `onlyus-touch-${pairCode}`;
    const ch = supabase.channel(topic);

    ch.on('broadcast', { event: 'touch' }, ({ payload }) => {
      if (payload?.role !== role) {
        setPartnerHolding(Boolean(payload?.holding));
      }
    }).subscribe();

    return () => {
      void supabase?.removeChannel(ch);
      setMyHolding(false);
      setPartnerHolding(false);
    };
  }, [open, pairCode, role]);

  // Synchronized heartbeat haptics and soft chimes when both are holding
  const isSynchronized = myHolding && partnerHolding;
  useEffect(() => {
    if (isSynchronized) {
      playSoftChime('heartbeat');
      triggerHeartbeatHaptic();
      pulseIntervalRef.current = window.setInterval(() => {
        playSoftChime('heartbeat');
        triggerHeartbeatHaptic();
      }, 1200);
    } else {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
    }
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }
    };
  }, [isSynchronized]);

  function broadcastHold(holding: boolean) {
    setMyHolding(holding);
    if (holding) {
      triggerHeartbeatHaptic();
      playSoftChime('whisper');
    }
    if (supabase) {
      const topic = `onlyus-touch-${pairCode}`;
      void supabase.channel(topic).send({
        type: 'broadcast',
        event: 'touch',
        payload: { role, holding },
      });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-between p-6 select-none"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-rose-glow font-medium">
                <Sparkles className="h-3.5 w-3.5" /> Heartbeat Touch
              </div>
              <h2 className="text-xl font-bold text-white">Feel Each Other</h2>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Central Synchronized Heart Center */}
          <div className="relative flex-1 flex flex-col items-center justify-center text-center">
            {/* Ambient Background Aura */}
            <motion.div
              animate={{
                scale: isSynchronized ? [1, 1.4, 1] : myHolding ? 1.2 : 1,
                opacity: isSynchronized ? 0.75 : myHolding ? 0.45 : 0.2,
              }}
              transition={{ duration: isSynchronized ? 1.2 : 0.4, repeat: isSynchronized ? Infinity : 0 }}
              className="absolute h-72 w-72 rounded-full blur-3xl pointer-events-none"
              style={{
                background: isSynchronized
                  ? 'radial-gradient(circle, #ff4d8d, #8b5cf6, transparent 70%)'
                  : 'radial-gradient(circle, #ff4d8d, transparent 70%)',
              }}
            />

            {/* Ripple Waves */}
            {isSynchronized && (
              <div className="absolute flex items-center justify-center pointer-events-none">
                <span className="absolute h-56 w-56 rounded-full border-2 border-rose-glow/60 animate-ping" />
                <span className="absolute h-80 w-80 rounded-full border border-violet-glow/40 animate-pulse" />
              </div>
            )}

            {/* Interactive Touch Target */}
            <motion.div
              onPointerDown={() => broadcastHold(true)}
              onPointerUp={() => broadcastHold(false)}
              onPointerLeave={() => broadcastHold(false)}
              whileTap={{ scale: 0.94 }}
              animate={{
                scale: isSynchronized ? [1, 1.15, 1] : myHolding ? 1.08 : 1,
              }}
              transition={{
                duration: isSynchronized ? 1.2 : 0.3,
                repeat: isSynchronized ? Infinity : 0,
                ease: 'easeInOut',
              }}
              className={`relative z-10 h-40 w-40 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-glass transition-all duration-300 border-2 ${
                isSynchronized
                  ? 'bg-love-gradient border-white shadow-glow-pink'
                  : myHolding
                  ? 'bg-white/20 border-rose-glow shadow-glow-pink'
                  : 'glass border-white/20 hover:border-white/40'
              }`}
            >
              <Heart
                className={`h-16 w-16 transition-all duration-300 ${
                  isSynchronized
                    ? 'text-white fill-white scale-110'
                    : myHolding
                    ? 'text-rose-glow fill-rose-glow'
                    : 'text-white/60 fill-transparent'
                }`}
              />
              <span className="mt-1 text-[11px] font-semibold text-white/80">
                {isSynchronized ? 'Connected ❤️' : myHolding ? 'Holding…' : 'Hold Thumb'}
              </span>
            </motion.div>

            {/* Status text */}
            <div className="mt-8 max-w-xs space-y-1">
              <p className="text-sm font-semibold text-white">
                {isSynchronized
                  ? `Touching hands with ${partner.display_name} right now ✨`
                  : myHolding
                  ? `Waiting for ${partner.display_name} to touch the screen…`
                  : partnerHolding
                  ? `${partner.display_name} is touching the screen! Hold thumb now 💖`
                  : 'Place and hold your thumb on the heart.'}
              </p>
              <p className="text-xs text-white/50 leading-relaxed">
                When both of you hold the heart at the same time, your screens vibrate together in synchronized heartbeats.
              </p>
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="text-center text-[11px] text-white/40 pb-2">
            ONLYUS Touch Sync · Private &amp; Real-time
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
