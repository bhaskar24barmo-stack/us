import { ArrowLeft, Plus, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

interface LocalCountdown {
  id: string;
  title: string;
  targetAt: string;
  emoji: string;
  repeatYearly: boolean;
}

const STORAGE = 'onlyus.countdowns.v1';

function loadCountdowns(): LocalCountdown[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || '[]') as LocalCountdown[];
  } catch {
    return [];
  }
}

export default function CountdownsPage() {
  const navigate = useNavigate();
  const { world } = useAppStore();
  const [items, setItems] = useState<LocalCountdown[]>(() => loadCountdowns());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [emoji, setEmoji] = useState('💖');
  const [nowMs] = useState(() => Date.now());

  function save(next: LocalCountdown[]) {
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    save([
      {
        id: `cd-${Date.now()}`,
        title: title.trim(),
        targetAt: date,
        emoji,
        repeatYearly: true,
      },
      ...items,
    ]);
    setTitle('');
    setDate('');
  }

  function daysLeft(target: string) {
    const diff = new Date(target).getTime() - nowMs;
    const d = Math.ceil(diff / 86_400_000);
    if (d === 0) return 'Today!';
    if (d > 0) return `${d}d left`;
    return `${Math.abs(d)}d ago`;
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-4 no-scrollbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="h-9 w-9 rounded-xl glass flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Countdowns</h1>
          <p className="text-xs text-white/55">Anniversaries, trips &amp; special days</p>
        </div>
      </div>

      {/* Anniversary Card */}
      <div className="glass rounded-3xl p-4 border border-rose-glow/30 bg-love-gradient-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💍</span>
          <div>
            <div className="text-sm font-semibold">Our Anniversary</div>
            <div className="text-xs text-white/65">{world.anniversaryDate}</div>
          </div>
        </div>
        <Timer className="h-5 w-5 text-rose-glow" />
      </div>

      <form onSubmit={addItem} className="glass rounded-3xl p-4 space-y-2.5 border border-white/10">
        <div className="flex gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            className="w-12 text-center rounded-xl bg-white/5 border border-white/15 py-2 text-sm outline-none"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Birthday, trip, date night…"
            className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-love-gradient text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="glass rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-xs text-white/55">{item.targetAt}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-rose-glow/20 text-rose-soft text-xs font-semibold">
                {daysLeft(item.targetAt)}
              </span>
              <button
                type="button"
                onClick={() => save(items.filter((x) => x.id !== item.id))}
                aria-label="Delete countdown"
                className="p-1.5 rounded-lg text-white/45 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
