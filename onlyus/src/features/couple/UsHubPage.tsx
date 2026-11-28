import { useNavigate } from 'react-router-dom';
import { CalendarHeart, CheckSquare, BookHeart, Sparkles, Heart, Clock, Calendar, StickyNote } from 'lucide-react';
import { Card } from '@/design-system/Card';
import { useAppStore } from '@/stores/useAppStore';
import { COPY } from '@/copy';

export default function UsHubPage() {
  const navigate = useNavigate();
  const { world, profiles, currentUserRole } = useAppStore();
  const role = currentUserRole ?? 'me';
  const partnerRole = role === 'me' ? 'partner' : 'me';
  const partner = profiles[partnerRole];

  const countdowns = (() => {
    try {
      return (JSON.parse(localStorage.getItem('onlyus.countdowns.v1') || '[]') as Array<{
        title: string;
        target_at: string;
        emoji?: string;
      }>);
    } catch {
      return [];
    }
  })();

  const bucketList = (() => {
    try {
      return (JSON.parse(localStorage.getItem('onlyus.bucket.v1') || '[]') as Array<{
        title: string;
        done_at?: string | null;
      }>);
    } catch {
      return [];
    }
  })();

  const pendingBucket = bucketList.filter((b) => !b.done_at).length;
  const nextCountdown = [...countdowns].sort(
    (a, b) => new Date(a.target_at).getTime() - new Date(b.target_at).getTime()
  )[0];

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-5 no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif-love text-white">{COPY.us.title}</h1>
          <p className="text-xs text-white/60">{COPY.us.subtitle}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-love-gradient flex items-center justify-center shadow-glow-pink text-white">
          <Heart className="h-5 w-5 fill-current" />
        </div>
      </div>

      {/* Hero Relationship Badge */}
      <Card variant="glow" className="space-y-3 bg-gradient-to-br from-rose-500/15 to-violet-500/15">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-soft flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-rose-glow" /> Our Journey
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/80">
            {world.streakDays || 1} Days In Love
          </span>
        </div>
        <div className="text-lg font-bold text-white leading-snug">
          Building our forever with {partner.display_name} 💕
        </div>
        <p className="text-xs text-white/70 italic">
          "{world.dailyRomanticMessage || 'Every moment with you is my favorite memory.'}"
        </p>
      </Card>

      {/* Hub Navigation Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Countdowns Card */}
        <Card
          interactive
          onClick={() => navigate('/countdowns')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">{countdowns.length}</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Countdowns</div>
            <div className="text-[11px] text-white/60 truncate">
              {nextCountdown ? `${nextCountdown.emoji || '⏳'} ${nextCountdown.title}` : 'Plan next event'}
            </div>
          </div>
        </Card>

        {/* Bucket List Card */}
        <Card
          interactive
          onClick={() => navigate('/bucket-list')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">{pendingBucket} open</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Bucket List</div>
            <div className="text-[11px] text-white/60">Our dream checklist</div>
          </div>
        </Card>

        {/* Love Letters & Journal */}
        <Card
          interactive
          onClick={() => navigate('/journal')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
              <BookHeart className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">Private</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Love Letters</div>
            <div className="text-[11px] text-white/60">Shared couple diary</div>
          </div>
        </Card>

        {/* Photo Gallery & Memories */}
        <Card
          interactive
          onClick={() => navigate('/gallery')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
              <CalendarHeart className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">Albums</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Memories</div>
            <div className="text-[11px] text-white/60">Photos & moments</div>
          </div>
        </Card>

        {/* Date Planner */}
        <Card
          interactive
          onClick={() => navigate('/dates')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-pink-500/20 text-rose-300 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">Curate</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Date Planner</div>
            <div className="text-[11px] text-white/60">Romantic outings</div>
          </div>
        </Card>

        {/* Shared Notes */}
        <Card
          interactive
          onClick={() => navigate('/notes')}
          className="cursor-pointer space-y-2 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <StickyNote className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-white/50">Lists</span>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Shared Notes</div>
            <div className="text-[11px] text-white/60">Lists & secret ideas</div>
          </div>
        </Card>
      </div>

      {/* Romantic Milestones Preview */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-soft">
            Relationship Milestones
          </div>
        </div>
        <div className="space-y-2.5 text-xs text-white/80">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5">
            <span className="text-base select-none">💌</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white">First Message Sent</div>
              <div className="text-[10px] text-white/50">Where our forever began</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5">
            <span className="text-base select-none">💍</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white">Anniversary Date</div>
              <div className="text-[10px] text-white/50">
                {world.anniversaryDate || 'Celebrated every year'}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
