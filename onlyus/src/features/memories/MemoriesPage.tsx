import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarHeart,
  Flame,
  Heart,
  ImagePlus,
  MessageSquareHeart,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TiltCard from '@/components/TiltCard';
import { useAppStore } from '@/stores/useAppStore';

function BucketListCard() {
  const [items, setItems] = useState<Array<{ id: string; text: string; done: boolean }>>(() => {
    try {
      const raw = localStorage.getItem('onlyus.bucket.v4');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  });
  const [draft, setDraft] = useState('');

  const save = (next: Array<{ id: string; text: string; done: boolean }>) => {
    setItems(next);
    try {
      localStorage.setItem('onlyus.bucket.v4', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div className="glass rounded-3xl p-4 space-y-3 border border-white/15">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-rose-soft">✨ Our Bucket List</div>
        <span className="text-[10px] text-white/55">
          {items.filter((i) => i.done).length}/{items.length} done
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              save(items.map((x) => (x.id === item.id ? { ...x, done: !x.done } : x)))
            }
            className={`w-full text-left rounded-2xl px-3 py-2 text-xs flex items-center gap-2.5 border transition-colors ${
              item.done
                ? 'bg-emerald-500/15 border-emerald-400/30 text-white/60 line-through'
                : 'bg-white/5 border-white/10 text-white/85'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 ${
                item.done ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/30'
              }`}
            >
              {item.done ? '✓' : ''}
            </span>
            <span className="truncate">{item.text}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a shared goal…"
          className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow min-w-0"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            save([...items, { id: `b-${Date.now()}`, text: draft.trim(), done: false }]);
            setDraft('');
          }}
          className="px-3.5 py-2 rounded-2xl bg-love-gradient text-xs font-semibold text-white shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

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
    celebrateStreak,
  } = useAppStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const role = currentUserRole ?? 'me';
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const [memQuery, setMemQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [myAnswerDraft, setMyAnswerDraft] = useState(world.myAnswer);
  const [roulettePick, setRoulettePick] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const anniv = getCountdown(world.anniversaryDate);
  const bday = getCountdown(partner.birthday);
  const together = getTogetherSince(world.anniversaryDate);

  const todayMd = new Date().toISOString().slice(5, 10);
  const thisYear = new Date().getFullYear().toString();
  const onThisDayMemories = world.memories.filter(
    (m) => m.date.slice(5, 10) === todayMd && !m.date.startsWith(thisYear)
  );

  const visibleMemories = (
    tab === 'favorites' ? world.memories.filter((m) => m.favorite) : world.memories
  )
    .filter((m) => {
      if (!memQuery.trim()) return true;
      const q = memQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q) ||
        (m.location?.toLowerCase().includes(q) ?? false)
      );
    })
    .sort((a, b) =>
      sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

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
          <h1 className="text-2xl font-bold bg-love-gradient bg-clip-text text-transparent">Moments</h1>
          <p className="text-xs text-white/60">Stories, Snap Vault &amp; shared goals</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 rounded-2xl glass text-xs font-semibold flex items-center gap-1 text-white/90"
          >
            <ImagePlus className="h-3.5 w-3.5 text-rose-glow" /> Story
          </button>
          <button
            onClick={celebrateStreak}
            className="px-3 py-2 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center gap-1 shadow-glow-pink"
          >
            <Flame className="h-3.5 w-3.5" /> {world.streakDays}d
          </button>
        </div>
      </div>

      {/* Snapchat-style Stories Ring */}
      {world.memories.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {world.memories.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setStoryIdx(i)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className="p-[2.5px] rounded-full bg-love-gradient shadow-glow-pink">
                <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-ink-950 bg-ink-900">
                  <img src={m.image_url} alt={m.title} className="h-full w-full object-cover" />
                </div>
              </div>
              <span className="text-[10px] text-white/75 max-w-[64px] truncate">{m.title}</span>
            </button>
          ))}
        </div>
      )}

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
          <span className="text-violet-300 font-semibold">{partner.display_name}:</span>{' '}
          <span className={world.myAnswer.trim() ? '' : 'blur-sm select-none'}>
            {world.partnerAnswer}
          </span>
          {!world.myAnswer.trim() && (
            <span className="block text-[10px] text-rose-soft mt-1">
              Save your answer below to unlock {partner.display_name}’s reply ✨
            </span>
          )}
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

      {/* Date Night Roulette */}
      <div className="glass rounded-3xl p-4 space-y-2.5 border border-white/15">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-rose-soft">🎲 Date Night Roulette</div>
          <button
            type="button"
            onClick={() => {
              const ideas = [
                'Midnight Chai & Stargazing ☕✨',
                'Late Night Long Drive 🚗💨',
                'Cook Dinner Together on Video Call 🍝',
                'Movie Blanket Fort & Popcorn 🍿',
                'Sunset Walk & Ice Cream 🍦',
                '20 Questions & Truths 🎙️💜',
              ];
              setSpinning(true);
              setTimeout(() => {
                setRoulettePick(ideas[Math.floor(Math.random() * ideas.length)]);
                setSpinning(false);
              }, 450);
            }}
            className="px-3 py-1 rounded-full bg-love-gradient text-[11px] font-semibold text-white shadow-glow-pink"
          >
            {spinning ? 'Spinning…' : 'Spin'}
          </button>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white/85">
          {roulettePick ?? 'Tap Spin to pick tonight’s spontaneous plan ✨'}
        </div>
      </div>

      {/* Shared Bucket List */}
      <BucketListCard />

      {/* On This Day */}
      {onThisDayMemories.length > 0 && (
        <div className="glass rounded-3xl p-4 border border-amber-400/30 bg-amber-500/10 space-y-2">
          <div className="text-xs font-semibold text-amber-200">✨ On This Day</div>
          {onThisDayMemories.map((m) => (
            <div key={m.id} className="text-xs text-white/85">
              <span className="font-semibold">{m.title}</span> ({m.date}) — {m.note}
            </div>
          ))}
        </div>
      )}

      {/* Shared Gallery */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={memQuery}
            onChange={(e) => setMemQuery(e.target.value)}
            placeholder="Search memories…"
            className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none focus:border-rose-glow min-w-0"
          />
          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            className="px-3 py-2 rounded-2xl glass text-[11px] text-white/80 shrink-0"
          >
            {sortOrder === 'newest' ? 'Newest ↓' : 'Oldest ↑'}
          </button>
        </div>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDeleteId === m.id) {
                        updateWorld({ memories: world.memories.filter((x) => x.id !== m.id) });
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(m.id);
                      }
                    }}
                    aria-label="Delete memory"
                    className="absolute top-2.5 left-2.5 px-2 h-8 rounded-full glass-strong flex items-center justify-center text-[10px] text-white/85 hover:text-rose-300"
                  >
                    {confirmDeleteId === m.id ? 'Confirm?' : '×'}
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
      {/* Full-Screen Snapchat-style Story Viewer */}
      <AnimatePresence>
        {storyIdx !== null && world.memories[storyIdx] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4"
          >
            <div className="space-y-3 z-10">
              <div className="flex gap-1">
                {world.memories.map((m, i) => (
                  <div key={m.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                    <div className={`h-full rounded-full ${i <= storyIdx ? 'bg-white w-full' : 'w-0'}`} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{world.memories[storyIdx].title}</div>
                  <div className="text-[11px] text-white/65">{world.memories[storyIdx].date}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStoryIdx(null)}
                  aria-label="Close story"
                  className="h-9 w-9 rounded-full bg-black/55 border border-white/20 flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <img
              src={world.memories[storyIdx].image_url}
              alt={world.memories[storyIdx].title}
              className="absolute inset-0 h-full w-full object-contain"
            />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStoryIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
                className="flex-1 py-8 text-left text-xs text-white/0"
                aria-label="Previous story"
              >
                Prev
              </button>
              <p className="glass-strong rounded-2xl px-4 py-2.5 text-xs text-center text-white/95 max-w-[85%]">
                {world.memories[storyIdx].note}
              </p>
              <button
                type="button"
                onClick={() =>
                  setStoryIdx((i) =>
                    i !== null && i < world.memories.length - 1 ? i + 1 : null
                  )
                }
                className="flex-1 py-8 text-right text-xs text-white/0"
                aria-label="Next story"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
