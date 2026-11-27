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
      ? 'h-20 w-20 rounded-full text-3xl'
      : size === 'lg'
      ? 'h-14 w-14 rounded-full text-2xl'
      : size === 'sm'
      ? 'h-8 w-8 rounded-full text-sm'
      : 'h-10 w-10 rounded-full text-lg';

  const auraRing = profile.aura_ring ?? 'none';

  const ringStyle =
    auraRing === 'heartbeat'
      ? 'ring-2 ring-rose-500/80 shadow-glow-pink'
      : auraRing === 'golden'
      ? 'ring-2 ring-amber-400/90 shadow-glow-amber'
      : auraRing === 'flame'
      ? 'ring-2 ring-orange-500/90 shadow-md shadow-orange-500/40'
      : auraRing === 'rose'
      ? 'ring-2 ring-pink-400/80 shadow-glow-pink'
      : 'ring-1 ring-white/15';

  const isLateNight = (() => {
    const hour = new Date().getHours();
    return hour >= 23 || hour < 6;
  })();

  return (
    <div className="relative shrink-0 select-none">
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`${dims} rounded-full overflow-hidden flex items-center justify-center border border-white/20 ${ringStyle} transition-all duration-300`}
        style={{ background: `linear-gradient(135deg, ${profile.accent_color}, #8b5cf6)` }}
      >
        {profile.avatar_path ? (
          <img
            src={profile.avatar_path}
            alt={profile.display_name}
            className="h-full w-full object-cover object-center rounded-full"
            loading="lazy"
          />
        ) : (
          <span className="font-semibold select-none leading-none">{profile.avatar_emoji}</span>
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
