import { motion } from 'framer-motion';
import type { Profile } from '@/types/models';

interface AvatarBubbleProps {
  profile: Profile;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
}

export default function AvatarBubble({ profile, size = 'md', showOnline = false }: AvatarBubbleProps) {
  const dims =
    size === 'xl'
      ? 'h-24 w-24 rounded-3xl text-4xl'
      : size === 'lg'
      ? 'h-16 w-16 rounded-2xl text-3xl'
      : size === 'sm'
      ? 'h-9 w-9 rounded-xl text-base'
      : 'h-11 w-11 rounded-2xl text-xl';

  const auraRing = profile.aura_ring ?? 'heartbeat';

  const ringStyle =
    auraRing === 'heartbeat'
      ? 'ring-2 ring-rose-500/80 shadow-glow-pink'
      : auraRing === 'golden'
      ? 'ring-2 ring-amber-400/90 shadow-glow-amber'
      : auraRing === 'flame'
      ? 'ring-2 ring-orange-500/90 shadow-lg shadow-orange-500/40'
      : auraRing === 'rose'
      ? 'ring-2 ring-pink-400/80 shadow-glow-pink'
      : 'ring-1 ring-white/20';

  const isLateNight = (() => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 6;
  })();

  return (
    <div className="relative shrink-0 select-none">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`${dims} overflow-hidden flex items-center justify-center border border-white/20 ${ringStyle} transition-all duration-300`}
        style={{ background: `linear-gradient(135deg, ${profile.accent_color}, #8b5cf6)` }}
      >
        {profile.avatar_path ? (
          <img
            src={profile.avatar_path}
            alt={profile.display_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span>{profile.avatar_emoji}</span>
        )}
      </motion.div>

      {/* Online Pulse Indicator */}
      {showOnline && profile.online && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-ink-950" />
        </span>
      )}

      {/* Late night sleep indicator */}
      {showOnline && !profile.online && isLateNight && (
        <span className="absolute -top-1.5 -right-1 text-[11px] animate-bounce select-none pointer-events-none">
          💤
        </span>
      )}
    </div>
  );
}
