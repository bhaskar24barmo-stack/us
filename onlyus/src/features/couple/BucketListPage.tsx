import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

interface BucketItem {
  id: string;
  title: string;
  doneBy: string | null;
  doneAt: string | null;
}

const STORAGE = 'onlyus.bucket.v1';

function loadBucket(): BucketItem[] {
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
  const [items, setItems] = useState<BucketItem[]>(() => loadBucket());
  const [draft, setDraft] = useState('');

  function save(next: BucketItem[]) {
    setItems(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    save([{ id: `b-${Date.now()}`, title: draft.trim(), doneBy: null, doneAt: null }, ...items]);
    setDraft('');
  }

  function toggleItem(id: string) {
    save(
      items.map((x) =>
        x.id === id
          ? {
              ...x,
              doneBy: x.doneAt ? null : me.display_name,
              doneAt: x.doneAt ? null : new Date().toISOString().slice(0, 10),
            }
          : x
      )
    );
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
                onClick={() => save(items.filter((x) => x.id !== item.id))}
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
