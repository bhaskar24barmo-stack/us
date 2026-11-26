import { ArrowLeft, EyeOff, Globe, Heart, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

interface LocalJournalEntry {
  id: string;
  title: string;
  body: string;
  visibility: 'shared' | 'private';
  authorId: string;
  date: string;
}

const STORAGE = 'onlyus.journal.v1';

function loadJournal(): LocalJournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || '[]') as LocalJournalEntry[];
  } catch {
    return [];
  }
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { currentUserRole, profiles } = useAppStore();
  const me = profiles[currentUserRole ?? 'me'];
  const [entries, setEntries] = useState<LocalJournalEntry[]>(() => loadJournal());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared');

  function save(next: LocalJournalEntry[]) {
    setEntries(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    save([
      {
        id: `j-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        visibility,
        authorId: me.id,
        date: new Date().toISOString().slice(0, 10),
      },
      ...entries,
    ]);
    setTitle('');
    setBody('');
  }

  const visibleEntries = entries.filter(
    (e) => e.visibility === 'shared' || e.authorId === me.id
  );

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
          <h1 className="text-xl font-bold">Journal &amp; Love Letters</h1>
          <p className="text-xs text-white/55">Shared notes or private reflections</p>
        </div>
      </div>

      <form onSubmit={addEntry} className="glass rounded-3xl p-4 space-y-2.5 border border-white/10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title…"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a love letter or journal entry…"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none focus:border-rose-glow resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setVisibility('shared')}
              className={`px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1 ${
                visibility === 'shared' ? 'bg-rose-glow/25 text-rose-soft border border-rose-glow/40' : 'glass text-white/60'
              }`}
            >
              <Globe className="h-3 w-3" /> Shared
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1 ${
                visibility === 'private' ? 'bg-violet-glow/25 text-violet-200 border border-violet-glow/40' : 'glass text-white/60'
              }`}
            >
              <EyeOff className="h-3 w-3" /> Private
            </button>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-love-gradient text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </form>

      <div className="space-y-2.5">
        {visibleEntries.map((entry) => (
          <div key={entry.id} className="glass rounded-3xl p-4 space-y-1.5 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-rose-glow fill-rose-glow" />
                <span className="text-sm font-semibold">{entry.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {entry.visibility}
                </span>
                {entry.authorId === me.id && (
                  <button
                    type="button"
                    onClick={() => save(entries.filter((x) => x.id !== entry.id))}
                    aria-label="Delete entry"
                    className="text-white/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed">{entry.body}</p>
            <div className="text-[10px] text-white/45">{entry.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
