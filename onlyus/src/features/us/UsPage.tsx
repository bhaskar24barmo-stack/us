import { motion } from 'framer-motion';
import { CalendarHeart, Edit3, Heart, Mail, MessageSquareHeart, Pin, Plus, Send, StickyNote, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import TiltCard from '@/components/TiltCard';
import { useAppStore } from '@/stores/useAppStore';

interface SharedNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
}

interface ImportantDateItem {
  id: string;
  title: string;
  date: string;
  kind: 'birthday' | 'anniversary' | 'first_meeting' | 'first_date' | 'custom';
  remindDays: number;
}

const DAILY_QUESTIONS = [
  'What is your favourite memory of us?',
  'What made you smile today?',
  'Where should we travel together?',
  'What is one thing you love about us?',
];

function calcYMD(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days), totalDays };
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const [, m, d] = dateStr.split('-').map(Number);
  let target = new Date(now.getFullYear(), (m || 1) - 1, d || 1);
  if (target.getTime() < now.getTime() - 86_400_000) {
    target = new Date(now.getFullYear() + 1, (m || 1) - 1, d || 1);
  }
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));
}

export default function UsPage() {
  const { currentUserRole, profiles, world, updateWorld, addLoveLetter } = useAppStore();
  const role = currentUserRole ?? 'me';
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const [notes, setNotes] = useState<SharedNote[]>(() => {
    try {
      const raw = localStorage.getItem('onlyus.notes.v5');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  });
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [dates, setDates] = useState<ImportantDateItem[]>(() => {
    try {
      const raw = localStorage.getItem('onlyus.dates.v4');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [
      { id: 'd-1', title: 'Our Anniversary', date: world.anniversaryDate, kind: 'anniversary', remindDays: 7 },
      { id: 'd-2', title: `${partner.display_name}’s Birthday`, date: partner.birthday, kind: 'birthday', remindDays: 5 },
      { id: 'd-3', title: 'First Meeting', date: '2025-01-20', kind: 'first_meeting', remindDays: 3 },
    ];
  });
  const [dateTitle, setDateTitle] = useState('');
  const [dateValue, setDateValue] = useState('');

  const [letterTitle, setLetterTitle] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [answerDraft, setAnswerDraft] = useState(world.myAnswer);
  const [qIdx, setQIdx] = useState(0);

  useEffect(() => {
    try { localStorage.setItem('onlyus.notes.v5', JSON.stringify(notes)); } catch { /* ignore */ }
  }, [notes]);

  useEffect(() => {
    try { localStorage.setItem('onlyus.dates.v4', JSON.stringify(dates)); } catch { /* ignore */ }
  }, [dates]);

  const ymd = calcYMD(world.anniversaryDate);

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    if (editingNoteId) {
      setNotes(
        notes.map((n) =>
          n.id === editingNoteId
            ? { ...n, title: noteTitle.trim(), body: noteBody.trim(), updatedAt: new Date().toISOString() }
            : n
        )
      );
      setEditingNoteId(null);
    } else {
      setNotes([
        { id: `n-${Date.now()}`, title: noteTitle.trim(), body: noteBody.trim(), pinned: false, updatedAt: new Date().toISOString() },
        ...notes,
      ]);
    }
    setNoteTitle('');
    setNoteBody('');
  }

  function handleAddDate(e: React.FormEvent) {
    e.preventDefault();
    if (!dateTitle.trim() || !dateValue) return;
    setDates([...dates, { id: `d-${Date.now()}`, title: dateTitle.trim(), date: dateValue, kind: 'custom', remindDays: 3 }]);
    setDateTitle('');
    setDateValue('');
  }

  function handleSendLoveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!letterTitle.trim() || !letterBody.trim()) return;
    addLoveLetter(letterTitle.trim(), letterBody.trim(), 'Romantic');
    setLetterTitle('');
    setLetterBody('');
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-5 no-scrollbar">
      <div>
        <h1 className="text-2xl font-bold bg-love-gradient bg-clip-text text-transparent">Us</h1>
        <p className="text-xs text-white/60">Our days together, shared notes, dates &amp; love notes</p>
      </div>

      {/* Our Days Together */}
      <TiltCard className="glass rounded-3xl p-5 border border-rose-glow/30 bg-love-gradient-soft space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-soft">Our Days Together</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-glow/20 text-white">
            {ymd.totalDays} days
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { v: ymd.years, l: 'Years' },
            { v: ymd.months, l: 'Months' },
            { v: ymd.days, l: 'Days' },
          ].map((x) => (
            <div key={x.l} className="glass rounded-2xl py-2.5">
              <div className="text-2xl font-bold tabular-nums">{x.v}</div>
              <div className="text-[10px] text-white/60">{x.l}</div>
            </div>
          ))}
        </div>
      </TiltCard>

      {/* Important Dates */}
      <section className="glass rounded-3xl p-4 space-y-3 border border-white/15">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <CalendarHeart className="h-4 w-4" /> Important Dates &amp; Reminders
        </div>
        <div className="space-y-2">
          {dates.map((d) => {
            const left = daysUntil(d.date);
            return (
              <div key={d.id} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{d.title}</div>
                  <div className="text-[10px] text-white/55">{d.date} • Remind {d.remindDays}d before</div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-glow/20 text-violet-200 shrink-0">
                  {left === 0 ? 'Today! 🎉' : `in ${left}d`}
                </span>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleAddDate} className="flex gap-2">
          <input
            value={dateTitle}
            onChange={(e) => setDateTitle(e.target.value)}
            placeholder="Special date…"
            className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none min-w-0"
          />
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="rounded-2xl bg-white/5 border border-white/15 px-2 py-2 text-xs outline-none"
          />
          <button type="submit" className="px-3 py-2 rounded-2xl bg-love-gradient text-xs font-semibold shrink-0">
            <Plus className="h-4 w-4" />
          </button>
        </form>
      </section>

      {/* Shared Notes */}
      <section className="glass rounded-3xl p-4 space-y-3 border border-white/15">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <StickyNote className="h-4 w-4" /> Shared Notes
        </div>
        <div className="space-y-2">
          {[...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned)).map((n) => (
            <div key={n.id} className="rounded-2xl bg-white/5 border border-white/10 p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{n.title}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(n.id);
                      setNoteTitle(n.title);
                      setNoteBody(n.body);
                    }}
                    aria-label="Edit note"
                    className="p-1 rounded-lg text-white/40 hover:text-white"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotes(notes.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)))}
                    aria-label="Pin note"
                    className={`p-1 rounded-lg ${n.pinned ? 'text-amber-300' : 'text-white/40 hover:text-white'}`}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}
                    aria-label="Delete note"
                    className="p-1 rounded-lg text-white/40 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {n.body && <p className="text-xs text-white/70">{n.body}</p>}
            </div>
          ))}
        </div>
        <form onSubmit={handleAddNote} className="space-y-2">
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Note title…"
            className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none"
          />
          <div className="flex gap-2">
            <input
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write a shared note…"
              className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none min-w-0"
            />
            <button type="submit" className="px-3.5 py-2 rounded-2xl bg-love-gradient text-xs font-semibold shrink-0">
              Add
            </button>
          </div>
        </form>
      </section>

      {/* Daily Question */}
      <section className="glass rounded-3xl p-4 space-y-3 border border-white/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
            <MessageSquareHeart className="h-4 w-4" /> Daily Question
          </div>
          <button
            type="button"
            onClick={() => setQIdx((i) => (i + 1) % DAILY_QUESTIONS.length)}
            className="text-[11px] text-white/60 hover:text-white underline"
          >
            Next question
          </button>
        </div>
        <p className="text-sm font-medium">{DAILY_QUESTIONS[qIdx]}</p>
        <div className="rounded-2xl bg-white/5 p-3 text-xs text-white/80">
          <span className="text-violet-300 font-semibold">{partner.display_name}:</span> {world.partnerAnswer}
        </div>
        <div className="flex gap-2">
          <input
            value={answerDraft}
            onChange={(e) => setAnswerDraft(e.target.value)}
            placeholder="Your answer…"
            className="flex-1 rounded-2xl bg-white/5 border border-white/15 px-3 py-2 text-xs outline-none min-w-0"
          />
          <button
            type="button"
            onClick={() => updateWorld({ myAnswer: answerDraft })}
            className="px-3.5 py-2 rounded-2xl bg-love-gradient text-xs font-semibold shrink-0"
          >
            Save
          </button>
        </div>
      </section>

      {/* Love Notes */}
      <form onSubmit={handleSendLoveNote} className="glass rounded-3xl p-4 space-y-2.5 border border-white/15">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-soft">
          <Mail className="h-4 w-4" /> Send Love Note
        </div>
        <input
          value={letterTitle}
          onChange={(e) => setLetterTitle(e.target.value)}
          placeholder="Title…"
          className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none"
        />
        <textarea
          value={letterBody}
          onChange={(e) => setLetterBody(e.target.value)}
          rows={2}
          placeholder="Write a sweet love note…"
          className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-2 text-xs outline-none resize-none"
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          className="w-full py-2.5 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow-pink"
        >
          <Send className="h-3.5 w-3.5" /> Send Love Note <Heart className="h-3.5 w-3.5 fill-white" />
        </motion.button>
      </form>
    </div>
  );
}
