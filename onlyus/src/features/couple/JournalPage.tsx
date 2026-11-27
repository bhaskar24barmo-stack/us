import { ArrowLeft, EyeOff, Globe, Heart, Moon, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playSoftChime, triggerHeartbeatHaptic } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

interface LocalJournalEntry {
  id: string;
  title: string;
  body: string;
  visibility: 'shared' | 'private' | 'midnight';
  authorId: string;
  date: string;
  authorName: string;
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
  const partner = profiles[currentUserRole === 'me' ? 'partner' : 'me'];

  const [entries, setEntries] = useState<LocalJournalEntry[]>(() => loadJournal());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private' | 'midnight'>('shared');

  function save(next: LocalJournalEntry[]) {
    setEntries(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    playSoftChime('harp');
    triggerHeartbeatHaptic();

    save([
      {
        id: `j-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        visibility,
        authorId: me.id,
        authorName: me.display_name,
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      },
      ...entries,
    ]);
    setTitle('');
    setBody('');
  }

  const visibleEntries = entries.filter(
    (e) => e.visibility === 'shared' || e.visibility === 'midnight' || e.authorId === me.id
  );

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-4 no-scrollbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Love Letters &amp; Journal</h1>
          <p className="text-xs text-white/55">Words written for {partner.display_name}</p>
        </div>
      </div>

      <form onSubmit={addEntry} className="glass rounded-3xl p-4 space-y-3 border border-white/10 shadow-glass">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. A thought before I sleep)…"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow text-white placeholder-white/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write your honest heart into words…"
          className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow resize-none text-white placeholder-white/40 leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setVisibility('shared')}
              className={`px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5 transition-colors ${
                visibility === 'shared'
                  ? 'bg-rose-glow/25 text-rose-soft border border-rose-glow/40 shadow-glow-pink'
                  : 'glass text-white/60 hover:text-white'
              }`}
            >
              <Globe className="h-3 w-3" /> Shared
            </button>
            <button
              type="button"
              onClick={() => setVisibility('midnight')}
              className={`px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5 transition-colors ${
                visibility === 'midnight'
                  ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40 shadow-glow-pink'
                  : 'glass text-white/60 hover:text-white'
              }`}
            >
              <Moon className="h-3 w-3" /> Midnight Letter
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`px-3 py-1.5 rounded-full text-[11px] flex items-center gap-1.5 transition-colors ${
                visibility === 'private'
                  ? 'bg-violet-glow/25 text-violet-200 border border-violet-glow/40 shadow-glow-pink'
                  : 'glass text-white/60 hover:text-white'
              }`}
            >
              <EyeOff className="h-3 w-3" /> Private
            </button>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-love-gradient text-xs font-semibold flex items-center gap-1.5 text-white shadow-glow-pink"
          >
            <Plus className="h-3.5 w-3.5" /> Seal with Love
          </button>
        </div>

        {visibility === 'midnight' && (
          <p className="text-[10px] text-amber-200/80 bg-amber-400/10 p-2 rounded-xl border border-amber-400/20">
            🌙 <strong>Midnight Letter:</strong> Written late at night without buzzing her phone. Delivers as a gentle sunrise notification.
          </p>
        )}
      </form>

      <div className="space-y-3">
        {visibleEntries.map((entry) => {
          const isMidnight = entry.visibility === 'midnight';
          return (
            <div
              key={entry.id}
              className={`glass rounded-3xl p-4 space-y-2 border transition-all ${
                isMidnight
                  ? 'border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-900/15'
                  : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMidnight ? (
                    <span className="h-6 w-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-xs">
                      🌙
                    </span>
                  ) : (
                    <Heart className="h-4 w-4 text-rose-glow fill-rose-glow" />
                  )}
                  <span className="text-sm font-bold text-white">{entry.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isMidnight
                        ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                        : entry.visibility === 'private'
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'bg-white/10 text-white/70'
                    }`}
                  >
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

              <p className="text-xs text-white/85 whitespace-pre-wrap leading-relaxed font-sans">{entry.body}</p>

              <div className="flex items-center justify-between pt-1 text-[10px] text-white/45">
                <span>By {entry.authorName || (entry.authorId === me.id ? me.display_name : partner.display_name)}</span>
                <span>{entry.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
