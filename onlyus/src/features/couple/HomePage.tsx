import { motion } from 'framer-motion';
import {
  Camera,
  CheckSquare,
  Flame,
  Heart,
  Image,
  MessageCircleHeart,
  NotebookPen,
  Phone,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarBubble from '@/components/AvatarBubble';
import TiltCard from '@/components/TiltCard';
import { t } from '@/lib/i18n';
import { useAppStore } from '@/stores/useAppStore';

const MOOD_CHOICES = [
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🥺', label: 'Miss you' },
  { emoji: '✨', label: 'Excited' },
  { emoji: '😴', label: 'Sleepy' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const {
    currentUserRole,
    profiles,
    world,
    messages,
    sendHeartbeat,
    setMyVibe,
    updateWorld,
    celebrateStreak,
  } = useAppStore();

  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const partner = profiles[role === 'me' ? 'partner' : 'me'];
  const [pingSent, setPingSent] = useState(false);
  const [answerDraft, setAnswerDraft] = useState(world.myAnswer || '');
  const [nowMs] = useState(() => Date.now());

  const daysTogether = useMemo(() => {
    const start = new Date(world.anniversaryDate || new Date(nowMs).toISOString().slice(0, 10));
    const diff = nowMs - start.getTime();
    return Math.max(1, Math.floor(diff / 86_400_000));
  }, [world.anniversaryDate, nowMs]);

  const unreadCount = useMemo(
    () => messages.filter((m) => m.sender_id !== me.id && !m.read_at && !m.deleted_at).length,
    [messages, me.id]
  );

  const latestPhoto = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => !m.deleted_at && m.media && m.kind === 'image')?.media?.url ??
      world.memories[0]?.image_url ??
      null,
    [messages, world.memories]
  );

  function handleThinkingOfYou() {
    sendHeartbeat();
    setPingSent(true);
    setTimeout(() => setPingSent(false), 2200);
  }

  function handleSaveDailyAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answerDraft.trim()) return;
    updateWorld({ myAnswer: answerDraft.trim() });
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-4 no-scrollbar">
      {/* Couple Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <AvatarBubble profile={me} size="md" />
            <AvatarBubble profile={partner} size="md" showOnline />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-love-gradient bg-clip-text text-transparent">
              {t('app.name')}
            </h1>
            <p className="text-xs text-white/60">
              {me.display_name} &amp; {partner.display_name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={celebrateStreak}
          className="px-3 py-1.5 rounded-full glass border border-amber-400/30 flex items-center gap-1.5 text-xs font-semibold text-amber-200"
        >
          <Flame className="h-4 w-4 text-amber-400 fill-amber-400" />
          <span>{world.streakDays}d</span>
        </button>
      </div>

      {/* Days Together Hero */}
      <TiltCard className="glass rounded-3xl p-5 bg-love-gradient-soft border border-rose-glow/25 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-rose-soft font-semibold">
              Days Together
            </div>
            <div className="text-3xl font-bold mt-0.5">{daysTogether} days</div>
            <p className="text-xs text-white/60 mt-0.5">
              Since {new Date(world.anniversaryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={handleThinkingOfYou}
            className="px-4 py-2.5 rounded-2xl bg-love-gradient text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-pink"
          >
            <Heart className="h-4 w-4 fill-white" />
            {pingSent ? 'Sent!' : 'Thinking of You'}
          </motion.button>
        </div>

        {/* Partner Mood */}
        <div className="rounded-2xl bg-black/25 border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              {partner.display_name}&apos;s Mood
            </div>
            <div className="text-xs font-medium truncate mt-0.5">
              {partner.status_text || 'Online'}
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/75 shrink-0">
            {partner.online ? 'Online' : 'Away'}
          </span>
        </div>
      </TiltCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => navigate('/chats')}
          className="relative glass rounded-2xl py-3 flex flex-col items-center gap-1.5 hover:border-rose-glow/40 transition-colors"
        >
          <MessageCircleHeart className="h-5 w-5 text-rose-glow" />
          <span className="text-[11px] font-medium">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-2 h-4 min-w-[16px] px-1 rounded-full bg-rose-glow text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => navigate('/camera')}
          className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 hover:border-rose-glow/40 transition-colors"
        >
          <Camera className="h-5 w-5 text-violet-glow" />
          <span className="text-[11px] font-medium">Camera</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/gallery')}
          className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 hover:border-rose-glow/40 transition-colors"
        >
          <Image className="h-5 w-5 text-sky-300" />
          <span className="text-[11px] font-medium">Gallery</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/calls')}
          className="glass rounded-2xl py-3 flex flex-col items-center gap-1.5 hover:border-rose-glow/40 transition-colors"
        >
          <Phone className="h-5 w-5 text-emerald-300" />
          <span className="text-[11px] font-medium">Call</span>
        </button>
      </div>

      {/* My Mood Check-in */}
      <div className="glass rounded-3xl p-4 space-y-2.5 border border-white/10">
        <div className="text-xs font-semibold text-white/80">Your Mood Check-in</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MOOD_CHOICES.map((m) => {
            const val = `${m.emoji} ${m.label}`;
            const active = me.status_text === val;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => setMyVibe(val)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  active
                    ? 'bg-love-gradient text-white border-transparent shadow-glow-pink'
                    : 'bg-white/5 border-white/10 text-white/75 hover:text-white'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today's Question */}
      <div className="glass rounded-3xl p-4 space-y-3 border border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <Sparkles className="h-4 w-4 text-rose-glow" /> Today&apos;s Question
        </div>
        <p className="text-sm font-medium leading-snug">{world.dailyQuestion}</p>
        {world.myAnswer ? (
          <div className="space-y-2 text-xs">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="text-[10px] text-rose-soft font-semibold mb-0.5">Your Answer</div>
              <p className="text-white/90">{world.myAnswer}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="text-[10px] text-violet-300 font-semibold mb-0.5">
                {partner.display_name}&apos;s Answer
              </div>
              <p className="text-white/60 italic">
                {world.partnerAnswer
                  ? world.partnerAnswer
                  : `Hidden until ${partner.display_name} answers today`}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveDailyAnswer} className="flex gap-2">
            <input
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="Write your answer…"
              className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none focus:border-rose-glow"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-2xl bg-love-gradient text-xs font-semibold text-white shrink-0"
            >
              Save
            </button>
          </form>
        )}
      </div>

      {/* Recent Memory & Couple Shortcuts */}
      {latestPhoto && (
        <div
          onClick={() => navigate('/gallery')}
          className="glass rounded-3xl overflow-hidden border border-white/10 cursor-pointer"
        >
          <div className="h-36 w-full relative">
            <img src={latestPhoto} alt="Recent memory" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3.5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-rose-soft font-semibold">
                  Recent Memory
                </div>
                <div className="text-xs font-medium text-white">Open Private Gallery →</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => navigate('/countdowns')}
          className="glass rounded-2xl p-3 flex flex-col items-start gap-1.5 text-left"
        >
          <Timer className="h-4 w-4 text-amber-300" />
          <span className="text-xs font-semibold">Countdowns</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/bucket-list')}
          className="glass rounded-2xl p-3 flex flex-col items-start gap-1.5 text-left"
        >
          <CheckSquare className="h-4 w-4 text-emerald-300" />
          <span className="text-xs font-semibold">Bucket List</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/journal')}
          className="glass rounded-2xl p-3 flex flex-col items-start gap-1.5 text-left"
        >
          <NotebookPen className="h-4 w-4 text-rose-soft" />
          <span className="text-xs font-semibold">Journal</span>
        </button>
      </div>
    </div>
  );
}
