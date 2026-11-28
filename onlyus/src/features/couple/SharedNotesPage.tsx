import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  StickyNote,
} from 'lucide-react';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { EmptyState } from '@/design-system/EmptyState';
import { Sheet } from '@/design-system/Sheet';
import { useAppStore } from '@/stores/useAppStore';

interface SharedNote {
  id: string;
  title: string;
  content: string;
  color: 'rose' | 'purple' | 'amber' | 'emerald' | 'sky';
  isPinned: boolean;
  updated_at: string;
}

const STORAGE_KEY = 'onlyus.notes.v1';

const INITIAL_NOTES: SharedNote[] = [
  {
    id: 'n1',
    title: 'Things I love about you 💖',
    content: '1. The way your eyes crinkle when you laugh\n2. How you always save the last bite for me\n3. Our late night talks about everything and nothing',
    color: 'rose',
    isPinned: true,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: 'Weekend Grocery & Snack Run 🍿',
    content: '• Matcha ice cream\n• Strawberries\n• Salted caramel popcorn\n• Sparkly peach water',
    color: 'amber',
    isPinned: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'n3',
    title: 'Gift Ideas for Our Anniversary 🎁',
    content: 'Custom engraved promise ring or that cozy vintage sweater they wanted!',
    color: 'purple',
    isPinned: false,
    updated_at: new Date().toISOString(),
  },
];

const COLOR_MAP = {
  rose: 'from-rose-500/15 to-pink-500/10 border-rose-500/25 text-rose-200',
  purple: 'from-purple-500/15 to-indigo-500/10 border-purple-500/25 text-purple-200',
  amber: 'from-amber-500/15 to-yellow-500/10 border-amber-500/25 text-amber-200',
  emerald: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/25 text-emerald-200',
  sky: 'from-sky-500/15 to-blue-500/10 border-sky-500/25 text-sky-200',
};

export default function SharedNotesPage() {
  const navigate = useNavigate();
  const { profiles, currentUserRole } = useAppStore();
  const partnerName = profiles[currentUserRole === 'me' ? 'partner' : 'me'].display_name;

  const [notes, setNotes] = useState<SharedNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SharedNote | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<SharedNote['color']>('rose');
  const [isPinned, setIsPinned] = useState(false);

  const saveNotes = (newNotes: SharedNote[]) => {
    setNotes(newNotes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
    } catch (err) {
      console.warn('Could not save notes:', err);
    }
  };

  const handleOpenAdd = (note?: SharedNote) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setIsPinned(note.isPinned);
    } else {
      setEditingNote(null);
      setTitle('');
      setContent('');
      setColor('rose');
      setIsPinned(false);
    }
    setIsAddOpen(true);
  };

  const handleSaveNote = () => {
    if (!title.trim() && !content.trim()) return;

    if (editingNote) {
      const updated = notes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: title.trim() || 'Untitled Note',
              content: content.trim(),
              color,
              isPinned,
              updated_at: new Date().toISOString(),
            }
          : n
      );
      saveNotes(updated);
    } else {
      const newNote: SharedNote = {
        id: `note-${Date.now()}`,
        title: title.trim() || 'Untitled Note',
        content: content.trim(),
        color,
        isPinned,
        updated_at: new Date().toISOString(),
      };
      saveNotes([newNote, ...notes]);
    }

    setIsAddOpen(false);
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    saveNotes(updated);
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveNotes(notes.filter((n) => n.id !== id));
  };

  const filteredNotes = notes
    .filter((n) => {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-4 no-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/us')}
            className="!p-2 -ml-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-serif-love text-white flex items-center gap-2">
              Shared Notes <Sparkles className="h-4 w-4 text-rose-glow" />
            </h1>
            <p className="text-xs text-white/60">Ideas & love lists with {partnerName}</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenAdd()}
          className="min-h-[44px] px-3.5 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> New Note
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
        <input
          type="text"
          placeholder="Search notes and lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-rose-glow/50"
        />
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card variant="glass" className="py-12">
          <EmptyState
            icon="📝"
            title="No notes found"
            description="Start a shared grocery list, travel itinerary, or secret love note."
            actionLabel="Create First Note"
            onAction={() => handleOpenAdd()}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              interactive
              onClick={() => handleOpenAdd(note)}
              className={`p-4 bg-gradient-to-br border cursor-pointer flex flex-col justify-between space-y-3 ${
                COLOR_MAP[note.color]
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-white line-clamp-1">{note.title}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => togglePin(note.id, e)}
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${
                        note.isPinned
                          ? 'text-rose-glow'
                          : 'text-white/30 hover:text-white/70'
                      }`}
                    >
                      <Pin className={`h-4 w-4 ${note.isPinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteNote(note.id, e)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-white/80 whitespace-pre-wrap line-clamp-4 leading-relaxed mt-1">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/50">
                <span>
                  {new Date(note.updated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {note.isPinned && <span className="font-semibold text-rose-soft">Pinned</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Sheet */}
      <Sheet
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingNote ? 'Edit Note' : 'New Shared Note'}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Title</label>
            <input
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Color Style</label>
            <div className="flex items-center gap-2">
              {(['rose', 'purple', 'amber', 'emerald', 'sky'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-white' : 'border-transparent opacity-60'
                  } ${
                    c === 'rose'
                      ? 'bg-rose-500'
                      : c === 'purple'
                      ? 'bg-purple-500'
                      : c === 'amber'
                      ? 'bg-amber-500'
                      : c === 'emerald'
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Content</label>
            <textarea
              placeholder="Write your love list, groceries, or thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full p-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-medium text-white/80">Pin to top of list</span>
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                isPinned
                  ? 'border-rose-glow bg-rose-glow/20 text-rose-200'
                  : 'border-white/10 bg-white/5 text-white/60'
              }`}
            >
              <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
              {isPinned ? 'Pinned' : 'Not Pinned'}
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleSaveNote}
            disabled={!title.trim() && !content.trim()}
            className="w-full min-h-[48px] mt-2 font-bold flex items-center justify-center gap-2"
          >
            <StickyNote className="h-4 w-4" /> Save Note
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
