import { motion } from 'framer-motion';
import {
  Battery,
  BatteryCharging,
  Camera,
  CheckSquare,
  Flame,
  Heart,
  Image,
  Lock,
  MessageCircleHeart,
  NotebookPen,
  Phone,
  Radio,
  Sparkles,
  Timer,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarBubble from '@/components/AvatarBubble';
import HeartbeatTouchModal from '@/components/HeartbeatTouchModal';
import TiltCard from '@/components/TiltCard';
import { CONVERSATION_ID } from '@/data/demoData';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { fetchPartnerBatteryStatus, publishMyBatteryStatus } from '@/services/deviceCare';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

const MOOD_CHOICES = [
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🥺', label: 'Miss you' },
  { emoji: '✨', label: 'Excited' },
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤍', label: 'Grateful' },
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
  const [touchModalOpen, setTouchModalOpen] = useState(false);
  const [partnerCare, setPartnerCare] = useState<{ battery: number | null; charging: boolean; online: boolean }>({
    battery: null,
    charging: false,
    online: false,
  });
  const [answerDraft, setAnswerDraft] = useState(world.myAnswer || '');
  const [nowMs] = useState(() => Date.now());

  // Publish own device battery & fetch partner real battery status from user_presence
  useEffect(() => {
    let mounted = true;

    async function syncPresenceAndBattery() {
      await publishMyBatteryStatus(me.id);
      const care = await fetchPartnerBatteryStatus(partner.id);
      if (mounted) setPartnerCare(care);
    }

    void syncPresenceAndBattery();
    const interval = setInterval(() => void syncPresenceAndBattery(), 30000);

    const presenceChan = supabase
      ? supabase
          .channel(`realtime-presence-home`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'user_presence', filter: `user_id=eq.${partner.id}` },
            (payload) => {
              if (payload.new && mounted) {
                const row = payload.new as { battery_level: number | null; is_charging: boolean; is_online: boolean };
                setPartnerCare({
                  battery: row.battery_level ?? null,
                  charging: Boolean(row.is_charging),
                  online: Boolean(row.is_online),
                });
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      mounted = false;
      clearInterval(interval);
      if (supabase && presenceChan) void supabase.removeChannel(presenceChan);
    };
  }, [me.id, partner.id]);

  // Sync Daily Answers with Supabase
  useEffect(() => {
    let mounted = true;
    const todayStr = new Date().toISOString().slice(0, 10);

    async function fetchDailyAnswers() {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('daily_answers')
          .select('*')
          .eq('conversation_id', CONVERSATION_ID)
          .eq('answer_date', todayStr);

        if (data && mounted) {
          const myRow = data.find((a: { user_id: string; answer: string }) => a.user_id === me.id);
          const partnerRow = data.find((a: { user_id: string; answer: string }) => a.user_id === partner.id);
          if (myRow) updateWorld({ myAnswer: myRow.answer });
          if (partnerRow) updateWorld({ partnerAnswer: partnerRow.answer });
        }
      } catch (err) {
        console.warn('Failed to fetch daily answers:', err);
      }
    }

    void fetchDailyAnswers();

    const answersChan = supabase
      ? supabase
          .channel(`realtime-answers-home`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'daily_answers', filter: `conversation_id=eq.${CONVERSATION_ID}` },
            () => {
              void fetchDailyAnswers();
            }
          )
          .subscribe()
      : null;

    return () => {
      mounted = false;
      if (supabase && answersChan) void supabase.removeChannel(answersChan);
    };
  }, [me.id, partner.id, updateWorld]);

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
    playSoftChime('whisper');
    triggerHeartbeatHaptic();
    setPingSent(true);
    setTimeout(() => setPingSent(false), 2200);
  }

  async function handleSaveDailyAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answerDraft.trim()) return;
    const txt = answerDraft.trim();
    updateWorld({ myAnswer: txt });
    playSoftChime('receive');
    triggerHeartbeatHaptic();

    const todayStr = new Date().toISOString().slice(0, 10);
    if (supabase) {
      try {
        await supabase.from('daily_answers').insert({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `da-${Date.now()}`,
          conversation_id: CONVERSATION_ID,
          question_id: '4a28983c-da6f-4ffd-a948-decab3ce394f',
          user_id: me.id,
          answer: txt,
          answer_date: todayStr,
        });
      } catch (err) {
        console.warn('Failed to sync daily answer:', err);
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-4 no-scrollbar">
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => navigate('/calls')}
            className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="Romantic Calls"
            aria-label="Calls"
          >
            <Phone className="h-4 w-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/camera')}
            className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/80 hover:text-white transition-colors"
            title="Couple Snaps"
            aria-label="Camera"
          >
            <Camera className="h-4 w-4 text-rose-glow" />
          </button>
          <button
            type="button"
            onClick={celebrateStreak}
            className="px-2.5 py-1.5 rounded-full glass border border-amber-400/30 flex items-center gap-1 text-xs font-semibold text-amber-200"
          >
            <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>{world.streakDays}d</span>
          </button>
        </div>
      </div>

      {/* Days Together Hero Card */}
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
            {pingSent ? 'Sent to her ❤️' : 'Thinking of You'}
          </motion.button>
        </div>

        {/* Partner Mood & Battery Care Status */}
        <div className="rounded-2xl bg-black/25 border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              {partner.display_name}&apos;s Mood
            </div>
            <div className="text-xs font-medium truncate mt-0.5">
              {partner.status_text || 'Thinking of you ✨'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {partnerCare.battery !== null ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/85 flex items-center gap-1 font-medium border border-white/10">
                {partnerCare.charging ? (
                  <BatteryCharging className="h-3 w-3 text-emerald-300 animate-pulse" />
                ) : (
                  <Battery className="h-3 w-3 text-rose-soft" />
                )}
                {partnerCare.charging ? `⚡ Charging • ${partnerCare.battery}%` : `${partnerCare.battery}%`}
              </span>
            ) : null}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/75">
              {partnerCare.online || partner.online ? 'Online' : 'Nearby'}
            </span>
          </div>
        </div>
      </TiltCard>

      {/* Partner Battery Care Alert */}
      {partnerCare.battery !== null && partnerCare.battery <= 20 && !partnerCare.charging && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-amber-500/15 border border-amber-400/40 p-3.5 flex items-center justify-between gap-3 shadow-glow-amber"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
              <Battery className="h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-200 truncate">
                {partner.display_name}&apos;s battery is low ({partnerCare.battery}%)
              </div>
              <p className="text-[10px] text-white/70 truncate">
                Remind her to plug in so you both stay connected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHeartbeatHaptic();
              playSoftChime('send');
              useAppStore.getState().sendMessage({
                kind: 'text',
                body: `⚡ Hey sweetheart, your battery is at ${partnerCare.battery}%! Please charge your phone so we can keep talking ❤️`,
              });
              setPingSent(true);
              setTimeout(() => setPingSent(false), 2000);
            }}
            className="shrink-0 px-3 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-ink-950 text-xs font-bold shadow-md shadow-amber-400/20 active:scale-95 transition-transform"
          >
            Remind ⚡
          </button>
        </motion.div>
      )}

      {/* Heartbeat Touch Banner */}
      <button
        type="button"
        onClick={() => setTouchModalOpen(true)}
        className="w-full glass rounded-3xl p-4 border border-rose-glow/30 flex items-center justify-between gap-3 text-left hover:border-rose-glow/60 transition-all bg-gradient-to-r from-rose-500/10 via-transparent to-violet-500/10 shadow-glass"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-love-gradient flex items-center justify-center text-xl shadow-glow-pink shrink-0">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              Simultaneous Heartbeat Touch
            </div>
            <p className="text-[11px] text-white/60">
              Hold the screen together to feel each other&apos;s pulse in real-time
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-xl bg-white/10 text-[10px] font-semibold text-rose-soft">
          Touch →
        </span>
      </button>

      {/* Quick Navigation Actions */}
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
        <div className="text-xs font-semibold text-white/80">How is your heart feeling today?</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MOOD_CHOICES.map((m) => {
            const val = `${m.emoji} ${m.label}`;
            const active = me.status_text === val;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => {
                  setMyVibe(val);
                  triggerHeartbeatHaptic();
                }}
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

      {/* Today's Question (Locked until answered) */}
      <div className="glass rounded-3xl p-4 space-y-3 border border-white/10">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <Sparkles className="h-4 w-4 text-rose-glow" /> Daily Couple Reflection
        </div>
        <p className="text-sm font-medium leading-snug">{world.dailyQuestion}</p>

        {world.myAnswer ? (
          <div className="space-y-2 text-xs">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="text-[10px] text-rose-soft font-semibold mb-0.5">Your Answer</div>
              <p className="text-white/90">{world.myAnswer}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
              <div className="text-[10px] text-violet-300 font-semibold mb-0.5 flex items-center gap-1">
                {partner.display_name}&apos;s Answer {!world.partnerAnswer && <Lock className="h-3 w-3" />}
              </div>
              {world.partnerAnswer ? (
                <p className="text-white/90">{world.partnerAnswer}</p>
              ) : (
                <p className="text-white/50 italic text-[11px]">
                  🔒 Answer hidden until {partner.display_name} submits her reflection today.
                </p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveDailyAnswer} className="flex gap-2">
            <input
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder="Write your honest thought…"
              className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none focus:border-rose-glow"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-2xl bg-love-gradient text-xs font-semibold text-white shrink-0"
            >
              Reveal
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

      {/* Heartbeat Touch Modal */}
      <HeartbeatTouchModal open={touchModalOpen} onClose={() => setTouchModalOpen(false)} />
    </div>
  );
}
