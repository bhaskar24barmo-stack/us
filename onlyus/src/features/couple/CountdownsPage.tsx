import { ArrowLeft, Plus, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONVERSATION_ID } from '@/data/demoData';
import { supabase } from '@/lib/supabase';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

interface LocalCountdown {
  id: string;
  title: string;
  targetAt: string;
  emoji: string;
  repeatYearly: boolean;
}

const STORAGE = 'onlyus.countdowns.v1';

function loadCachedCountdowns(): LocalCountdown[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || '[]') as LocalCountdown[];
  } catch {
    return [];
  }
}

export default function CountdownsPage() {
  const navigate = useNavigate();
  const { currentUserRole, profiles, world } = useAppStore();
  const role = currentUserRole ?? 'me';
  const me = profiles[role];

  const [items, setItems] = useState<LocalCountdown[]>(() => loadCachedCountdowns());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [emoji, setEmoji] = useState('💖');
  const [nowMs] = useState(() => Date.now());

  // Load from Supabase on mount and subscribe to realtime updates
  useEffect(() => {
    let mounted = true;
    if (!supabase) return;

    async function fetchRemote() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('countdowns')
          .select('*')
          .eq('conversation_id', CONVERSATION_ID)
          .order('target_at', { ascending: true });

        if (!error && data && mounted) {
          const mapped: LocalCountdown[] = data.map((d: { id: string; title: string; target_at: string; emoji: string; repeat_yearly: boolean }) => ({
            id: d.id,
            title: d.title,
            targetAt: d.target_at.slice(0, 10),
            emoji: d.emoji || '💖',
            repeatYearly: d.repeat_yearly,
          }));
          setItems(mapped);
          localStorage.setItem(STORAGE, JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Failed to fetch remote countdowns:', err);
      }
    }

    void fetchRemote();

    const channel = supabase
      .channel(`realtime-countdowns-${CONVERSATION_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'countdowns', filter: `conversation_id=eq.${CONVERSATION_ID}` },
        () => {
          void fetchRemote();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (supabase) void supabase.removeChannel(channel);
    };
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;

    playSoftChime('harp');
    triggerHeartbeatHaptic();

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cd-${Date.now()}`;
    const newItem: LocalCountdown = {
      id: newId,
      title: title.trim(),
      targetAt: date,
      emoji: emoji.trim() || '💖',
      repeatYearly: true,
    };

    const next = [newItem, ...items];
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    setTitle('');
    setDate('');

    // Sync to Supabase
    if (supabase) {
      try {
        await supabase.from('countdowns').insert({
          id: newId,
          conversation_id: CONVERSATION_ID,
          title: newItem.title,
          target_at: new Date(newItem.targetAt).toISOString(),
          emoji: newItem.emoji,
          repeat_yearly: true,
          created_by: me.id,
        });
      } catch (err) {
        console.warn('Failed to insert countdown into Supabase:', err);
      }
    }
  }

  async function deleteItem(id: string) {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    if (supabase) {
      try {
        await supabase.from('countdowns').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete countdown from Supabase:', err);
      }
    }
  }

  function daysLeft(target: string) {
    const diff = new Date(target).getTime() - nowMs;
    const d = Math.ceil(diff / 86_400_000);
    if (d === 0) return 'Today!';
    if (d > 0) return `${d}d left`;
    return `${Math.abs(d)}d ago`;
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-4 no-scrollbar">
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
                onClick={() => deleteItem(item.id)}
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
