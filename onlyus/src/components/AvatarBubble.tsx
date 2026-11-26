import type { Profile } from '@/types/models';

interface AvatarBubbleProps {
  profile: Profile;
  size?: 'sm' | 'md' | 'lg';
  showOnline?: boolean;
}

export default function AvatarBubble({ profile, size = 'md', showOnline = false }: AvatarBubbleProps) {
  const dims =
    size === 'lg'
      ? 'h-16 w-16 rounded-2xl text-3xl'
      : size === 'sm'
      ? 'h-9 w-9 rounded-xl text-base'
      : 'h-11 w-11 rounded-2xl text-xl';

  return (
    <div className="relative shrink-0">
      <div
        className={`${dims} overflow-hidden flex items-center justify-center shadow-glow-pink border border-white/15`}
        style={{ background: `linear-gradient(135deg, ${profile.accent_color}, #8b5cf6)` }}
      >
        {profile.avatar_path ? (
          <img
            src={profile.avatar_path}
            alt={profile.display_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{profile.avatar_emoji}</span>
        )}
      </div>
      {showOnline && profile.online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-ink-950" />
      )}
    </div>
  );
}
