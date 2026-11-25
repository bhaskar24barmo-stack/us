import { motion } from 'framer-motion';
import {
  CalendarHeart,
  Flame,
  Heart,
  ImagePlus,
  Mail,
  MessageSquareHeart,
  Send,
  Sparkles,
  Star,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TiltCard from '@/components/TiltCard';
import { useAppStore } from '@/stores/useAppStore';

function getCountdown(targetMonthDay: string) {
  const now = new Date();
  const [, m, d] = targetMonthDay.split('-').map(Number);
  let target = new Date(now.getFullYear(), (m || 1) - 1, d || 1);
  if (target.getTime() < now.getTime()) {
    target = new Date(now.getFullYear() + 1, (m || 1) - 1, d || 1);
  }
  const diff = target.getTime() - now.getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return { days, hours };
}

function getTogetherSince(anniversaryDate: string) {
  const start = new Date(`${anniversaryDate}T00:00:00`);
  const diffSec = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const days = Math.floor(diffSec / 86_400);
  const hours = Math.floor((diffSec % 86_400) / 3_600);
  const mins = Math.floor((diffSec % 3_600) / 60);
  const secs = diffSec % 60;
  return { days, hours, mins, secs };
}

export default function MemoriesPage() {
  const {
    currentUserRole,
    profiles,
    world,
    updateWorld,
    addMemory,
    toggleFavoriteMemory,
    addLoveLetter,
    celebrateStreak,
  } = useAppStore();

  const role = currentUserRole ?? 'me';
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [letterTitle, setLetterTitle] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [myAnswerDraft, setMyAnswerDraft] = useState(world.myAnswer);
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const anniv = getCountdown(world.anniversaryDate);
  const bday = getCountdown(partner.birthday);
  const together = getTogetherSince(world.anniversaryDate);

  const visibleMemories =
    tab === 'favorites' ? world.memories.filter((m) => m.favorite) : world.memories;

  function handleSendLetter(e: React.FormEvent) {
    e.preventDefault();
    if (!letterTitle.trim() || !letterBody.trim()) return;
    addLoveLetter(letterTitle.trim(), letterBody.trim(), 'Romantic');
    setLetterTitle('');
    setLetterBody('');
  }

  function handleUploadMemory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    addMemory({
      title: file.name.replace(/\.[^.]+$/, ''),
      date: new Date().toISOString().slice(0, 10),
      note: 'Added to Our World gallery',
      image_url: url,
      favorite: true,
    });
    e.target.value = '';
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-5 no-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-love-gradient bg-clip-text text-transparent">Our World</h1>
          <p className="text-xs text-white/60">Memories, streaks &amp; love notes for two</p>
        </div>
        <button
          onClick={celebrateStreak}
          className="px-3.5 py-2 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center gap-1.5 shadow-glow-pink"
        >
          <Flame className="h-4 w-4" /> {world.streakDays} Days
        </button>
      </div>

      {/* Daily Romantic Message */}
      <div className="glass rounded-3xl p-4 bg-love-gradient-soft border border-rose-glow/30">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-rose-soft font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5" /> Daily Romantic Note
        </div>
        <p className="text-sm italic text-white/90">“{world.dailyRomanticMessage}”</p>
      </div>

      {/* Live Together Counter */}
      <TiltCard className="glass rounded-3xl p-4 border border-violet-glow/30 bg-gradient-to-br from-violet-600/15 to-rose-500/10">
        <div className="text-[11px] uppercase tracking-wider text-violet-300 font-semibold mb-2">
          Together Since {world.anniversaryDate}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { v: together.days, l: 'Days' },
            { v: together.hours, l: 'Hours' },
            { v: together.mins, l: 'Mins' },
            { v: together.secs, l: 'Secs' },
          ].map((item) => (
            <div key={item.l} className="glass rounded-2xl py-2 px-1">
              <div className="text-lg font-bold tabular-nums">{String(item.v).padStart(2, '0')}</div>
              <div className="text-[10px] text-white/55">{item.l}</div>
            </div>
          ))}
        </div>
      </TiltCard>

      {/* Countdowns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-soft">
            <CalendarHeart className="h-4 w-4" /> Anniversary
          </div>
          <div className="text-2xl font-bold">{anniv.days}d {anniv.hours}h</div>
          <div className="text-[11px] text-white/55">Until {world.anniversaryDate.slice(5)}</div>
        </div>
        <div className="glass rounded-3xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-violet-300">
            <Heart className="h-4 w-4" /> {partner.display_name}’s Bday
          </div>
          <div className="text-2xl font-bold">{bday.days}d {bday.hours}h</div>
          <div className="text-[11px] text-white/55">Birthday countdown</div>
        </div>
      </div>

      {/* Daily Love Question */}
      <div className="glass rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <MessageSquareHeart className="h-4 w-4" /> Daily Love Question
        </div>
        <p className="text-sm font-medium">{world.dailyQuestion}</p>
        <div className="text-xs glass rounded-2xl p-3 text-white/80">
          <span className="text-violet-300 font-semibold">{partner.display_name}:</span> {world.partnerAnswer}
        </div>
        <div className="flex gap-2 items-end">
          <textarea
            rows={2}
            value={myAnswerDraft}
            onChange={(e) => setMyAnswerDraft(e.target.value)}
            placeholder="Your answer…"
            className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow resize-none"
          />
          <button
            onClick={() => updateWorld({ myAnswer: myAnswerDraft })}
            className="px-3.5 py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold shrink-0"
          >
            Save
          </button>
        </div>
      </div>

      {/* Love Letter Composer */}
      <form onSubmit={handleSendLetter} className="glass rounded-3xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <Mail className="h-4 w-4" /> Love Letter Composer
        </div>
        <input
          value={letterTitle}
          onChange={(e) => setLetterTitle(e.target.value)}
          placeholder="Letter title…"
          className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none focus:border-rose-glow"
        />
        <textarea
          value={letterBody}
          onChange={(e) => setLetterBody(e.target.value)}
          rows={2}
          placeholder="Write something from the heart (also sends to chat)…"
          className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none focus:border-rose-glow resize-none"
        />
        <button
          type="submit"
          className="w-full py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-pink"
        >
          <Send className="h-3.5 w-3.5" /> Send Love Letter
        </button>
      </form>

      {/* Love Letters Archive */}
      {world.loveLetters.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider text-white/55 font-semibold flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-rose-glow fill-rose-glow" /> Love Letters ({world.loveLetters.length})
            </h3>
          </div>
          <div className="space-y-2.5">
            {world.loveLetters.map((letter) => {
              const fromMe = letter.sender_id === profiles[role].id;
              const senderName = fromMe ? profiles[role].display_name : partner.display_name;
              return (
                <motion.div
                  key={letter.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-3xl p-4 border border-rose-glow/20 bg-gradient-to-br from-rose-500/10 to-violet-600/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{letter.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-glow/20 text-rose-soft text-[10px] shrink-0">
                      {letter.mood}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{letter.body}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-white/50">
                    <span>From {senderName}</span>
                    <span>{new Date(letter.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shared Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['all', 'favorites'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-full text-xs ${
                  tab === t ? 'bg-love-gradient text-white' : 'glass text-white/65'
                }`}
              >
                {t === 'all' ? 'All Memories' : 'Favorite Memories'}
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadMemory} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-full glass text-xs flex items-center gap-1 text-rose-soft"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Add Photo
          </button>
        </div>

        {visibleMemories.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center space-y-2">
            <div className="text-3xl">📸</div>
            <p className="text-sm font-medium">No {tab === 'favorites' ? 'favorite ' : ''}memories yet</p>
            <p className="text-xs text-white/55">
              {tab === 'favorites'
                ? 'Tap the star on any memory to save it to your favorites.'
                : 'Add a photo above to start building your shared gallery.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleMemories.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ y: -2 }}
                className="glass rounded-3xl overflow-hidden border border-white/10"
              >
                <div className="relative h-40">
                  <img src={m.image_url} alt={m.title} className="h-full w-full object-cover" />
                  <button
                    onClick={() => toggleFavoriteMemory(m.id)}
                    aria-label="Favorite memory"
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full glass-strong flex items-center justify-center"
                  >
                    <Star className={`h-4 w-4 ${m.favorite ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
                  </button>
                </div>
                <div className="p-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{m.title}</h3>
                    <span className="text-[10px] text-white/50">{m.date}</span>
                  </div>
                  <p className="text-xs text-white/65 mt-1">{m.note}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Relationship Timeline */}
      <div className="glass rounded-3xl p-4 space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-white/55 font-semibold">Relationship Timeline</h3>
        <div className="space-y-3 border-l-2 border-rose-glow/40 pl-4 ml-2">
          {world.timeline.map((ev) => (
            <div key={ev.id} className="relative">
              <span className="absolute -left-[25px] top-0.5 h-4 w-4 rounded-full bg-love-gradient flex items-center justify-center text-[9px]">
                {ev.icon}
              </span>
              <div className="text-xs font-semibold">{ev.title}</div>
              <div className="text-[10px] text-rose-soft">{ev.date}</div>
              <p className="text-xs text-white/65 mt-0.5">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
