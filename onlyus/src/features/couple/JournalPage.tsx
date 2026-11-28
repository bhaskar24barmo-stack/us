import { ArrowLeft, EyeOff, Globe, Heart, Moon, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { EmptyState } from '@/design-system/EmptyState';
import { COPY } from '@/copy';
import { CONVERSATION_ID } from '@/data/demoData';
import { supabase } from '@/lib/supabase';
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

function loadCachedJournal(): LocalJournalEntry[] {
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

  const [entries, setEntries] = useState<LocalJournalEntry[]>(() => loadCachedJournal());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'shared' | 'private' | 'midnight'>('shared');

  useEffect(() => {
    let mounted = true;
    if (!supabase) return;

    async function fetchRemote() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('conversation_id', CONVERSATION_ID)
          .order('created_at', { ascending: false });

        if (!error && data && mounted) {
          const mapped: LocalJournalEntry[] = data.map((d: { id: string; title: string; body: string; visibility: string; author_id: string; created_at: string }) => ({
            id: d.id,
            title: d.title,
            body: d.body,
            visibility: (d.visibility as 'shared' | 'private' | 'midnight') || 'shared',
            authorId: d.author_id,
            authorName: d.author_id === me.id ? me.display_name : partner.display_name,
            date: new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          }));
          setEntries(mapped);
          localStorage.setItem(STORAGE, JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Failed to fetch remote journal entries:', err);
      }
    }

    void fetchRemote();

    const channel = supabase
      .channel(`realtime-journal-${CONVERSATION_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journal_entries', filter: `conversation_id=eq.${CONVERSATION_ID}` },
        () => {
          void fetchRemote();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (supabase) void supabase.removeChannel(channel);
    };
  }, [me.id, me.display_name, partner.display_name]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    playSoftChime('harp');
    triggerHeartbeatHaptic();

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `j-${Date.now()}`;
    const newEntry: LocalJournalEntry = {
      id: newId,
      title: title.trim(),
      body: body.trim(),
      visibility,
      authorId: me.id,
      authorName: me.display_name,
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const next = [newEntry, ...entries];
    setEntries(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    setTitle('');
    setBody('');

    if (supabase) {
      try {
        await supabase.from('journal_entries').insert({
          id: newId,
          conversation_id: CONVERSATION_ID,
          author_id: me.id,
          title: newEntry.title,
          body: newEntry.body,
          visibility: newEntry.visibility,
          entry_date: new Date().toISOString().slice(0, 10),
        });
      } catch (err) {
        console.warn('Failed to insert journal entry into Supabase:', err);
      }
    }
  }

  async function deleteEntry(id: string) {
    const next = entries.filter((x) => x.id !== id);
    setEntries(next);
    localStorage.setItem(STORAGE, JSON.stringify(next));

    if (supabase) {
      try {
        await supabase.from('journal_entries').delete().eq('id', id);
      } catch (err) {
        console.warn('Failed to delete journal entry from Supabase:', err);
      }
    }
  }

  const visibleEntries = entries.filter(
    (e) => e.visibility === 'shared' || e.visibility === 'midnight' || e.authorId === me.id
  );

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-4 no-scrollbar">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-2xl glass flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold bg-love-gradient bg-clip-text text-transparent font-serif-love">
            Love Letters &amp; Journal
          </h1>
          <p className="text-xs text-white/55">Words written for {partner.display_name}</p>
        </div>
      </div>

      <Card variant="glow" className="p-4 space-y-3">
        <form onSubmit={addEntry} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. A thought before I sleep)…"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow text-white placeholder-white/40 font-serif-love"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Write your honest heart into words…"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-xs outline-none focus:border-rose-glow resize-none text-white placeholder-white/40 leading-relaxed font-serif-love"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setVisibility('shared')}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
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
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
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
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                  visibility === 'private'
                    ? 'bg-violet-glow/25 text-violet-200 border border-violet-glow/40 shadow-glow-pink'
                    : 'glass text-white/60 hover:text-white'
                }`}
              >
                <EyeOff className="h-3 w-3" /> Private
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex items-center gap-1.5 shadow-glow-pink text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Seal with Love
            </Button>
          </div>

          {visibility === 'midnight' && (
            <p className="text-[10px] text-amber-200/80 bg-amber-400/10 p-2.5 rounded-2xl border border-amber-400/20">
              🌙 <strong>Midnight Letter:</strong> Written late at night without buzzing her phone. Delivers as a gentle sunrise notification.
            </p>
          )}
        </form>
      </Card>

      <div className="space-y-3">
        {visibleEntries.length === 0 ? (
          <EmptyState
            icon="💌"
            title={COPY.journal.emptyTitle}
            description={COPY.journal.emptyDesc}
          />
        ) : (
          visibleEntries.map((entry) => {
            const isMidnight = entry.visibility === 'midnight';
            return (
              <Card
                key={entry.id}
                variant={isMidnight ? 'glow' : 'glass'}
                className={`p-4 space-y-2 border transition-all ${
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
                    <span className="text-sm font-bold text-white font-serif-love">{entry.title}</span>
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
                        onClick={() => deleteEntry(entry.id)}
                        aria-label="Delete entry"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center text-white/40 hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed font-serif-love">
                  {entry.body}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] text-white/45">
                  <span>By {entry.authorName || (entry.authorId === me.id ? me.display_name : partner.display_name)}</span>
                  <span>{entry.date}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
