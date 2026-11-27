import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONVERSATION_ID } from '@/data/demoData';
import { supabase } from '@/lib/supabase';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

interface BucketItem {
  id: string;
  title: string;
  doneBy: string | null;
  doneAt: string | null;
}

const STORAGE = 'onlyus.bucket.v1';

function loadCachedBucket(): BucketItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || '[]') as BucketItem[];
  } catch {
    return [];
  }
}

export default function BucketListPage() {
  const navigate = useNavigate();
  const { currentUserRole, profiles } = useAppStore();
  const me = profiles[currentUserRole ?? 'me'];
  const [items, setItems] = useState<BucketItem[]>(() => loadCachedBucket());
  const [draft, setDraft] = useState('');

  // Fetch from Supabase on mount and listen to realtime updates
  useEffect(() => {
    let mounted = true;
    if (!supabase) return;

    async function fetchRemote() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('bucket_list_items')
          .select('*')
          .eq('conversation_id', CONVERSATION_ID)
          .order('created_at', { ascending: false });

        if (!error && data && mounted) {
          const mapped: BucketItem[] = data.map((d: { id: string; title: string; done_at: string | null; done_by: string | null }) => {
            const partnerRole = currentUserRole === 'me' ? 'partner' : 'me';
            const partnerName = profiles[partnerRole].display_name;
            const doneName = d.done_by === me.id ? me.display_name : d.done_by ? partnerName : null;
            return {
              id: d.id,
              title: d.title,
              doneBy: doneName,
              doneAt: d.done_at ? d.done_at.slice(0, 10) : null,
            };
          });
          setItems(mapped);
          localStorage.setItem(STORAGE, JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Failed to fetch remote bucket list:', err);
      }
    }

    void fetchRemote();

    const channel = supabase
      .channel(`realtime-bucket-${CONVERSATION_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bucket_list_items', filter: `conversation_id=eq.${CONVERSATION_ID}` },
        () => {
          void fetchRemote();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (supabase) void supabase.removeChannel(channel);
    };
  }, [currentUserRole, me.id, me.display_name, profiles]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;

    playSoftChime('harp');
    triggerHeartbeatHaptic();

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}`;
    const newItem: BucketItem = { id: newId, title: draft.trim(), doneBy: null, doneAt: null };
    const next = [newItem, ...items];
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
    setDraft('');

    if (supabase) {
      try {
        await supabase.from('bucket_list_items').insert({
          id: newId,
          conversation_id: CONVERSATION_ID,
          title: newItem.title,
          created_by: me.id,
          sort: 0,
        });
      } catch (err) {
        console.warn('Failed to insert bucket item into Supabase:', err);
      }
    }
  }

  async function toggleItem(id: string) {
    playSoftChime('receive');
    triggerHeartbeatHaptic();

    const current = items.find((x) => x.id === id);
    const isDone = Boolean(current?.doneAt);

    const next = items.map((x) =>
      x.id === id
        ? {
            ...x,
            doneBy: isDone ? null : me.display_name,
            doneAt: isDone ? null : new Date().toISOString().slice(0, 10),
          }
        : x
    );
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    if (supabase) {
      try {
        await supabase
          .from('bucket_list_items')
          .update({
            done_at: isDone ? null : new Date().toISOString(),
            done_by: isDone ? null : me.id,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Failed to update bucket item in Supabase:', err);
      }
    }
  }

  async function deleteItem(id: string) {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    if (supabase) {
      try {
        await supabase.from('bucket_list_items').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete bucket item from Supabase:', err);
      }
    }
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
          <h1 className="text-xl font-bold">Bucket List</h1>
          <p className="text-xs text-white/55">Adventures to do together</p>
        </div>
      </div>

      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a dream or date idea…"
          className="flex-1 rounded-2xl glass px-3.5 py-2.5 text-xs outline-none border border-white/15 focus:border-rose-glow"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center text-xs text-white/55">
          No bucket list items yet. Add your first shared dream above.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="flex items-center gap-3 flex-1 text-left min-w-0"
              >
                <span
                  className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 ${
                    item.doneAt
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'border-white/25 bg-white/5'
                  }`}
                >
                  {item.doneAt && <Check className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                  <div className={`text-sm truncate ${item.doneAt ? 'line-through text-white/45' : ''}`}>
                    {item.title}
                  </div>
                  {item.doneAt && (
                    <div className="text-[10px] text-emerald-300">
                      Completed by {item.doneBy} • {item.doneAt}
                    </div>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                aria-label="Delete"
                className="p-1.5 text-white/40 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
