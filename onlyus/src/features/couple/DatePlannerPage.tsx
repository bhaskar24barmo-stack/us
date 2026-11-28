import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
} from 'lucide-react';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { EmptyState } from '@/design-system/EmptyState';
import { Sheet } from '@/design-system/Sheet';
import { useAppStore } from '@/stores/useAppStore';

interface DatePlan {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  category: 'dinner' | 'movie' | 'getaway' | 'cozy' | 'adventure';
  status: 'idea' | 'planned' | 'completed';
  notes?: string;
  created_at: string;
}

const STORAGE_KEY = 'onlyus.dates.v1';

const INITIAL_DATES: DatePlan[] = [
  {
    id: 'd1',
    title: 'Candlelight Italian Dinner',
    date: '2026-12-05',
    time: '8:00 PM',
    location: 'Ristorante Bella Luna',
    category: 'dinner',
    status: 'planned',
    notes: 'Order the truffle pasta and share dessert ✨',
    created_at: new Date().toISOString(),
  },
  {
    id: 'd2',
    title: 'Stargazing Blanket Picnic',
    date: '2026-12-12',
    time: '9:30 PM',
    location: 'Hilltop Overlook',
    category: 'adventure',
    status: 'idea',
    notes: 'Bring hot cocoa and our favorite playlist 🎶',
    created_at: new Date().toISOString(),
  },
  {
    id: 'd3',
    title: 'Cozy Movie Marathon',
    date: '2026-11-20',
    time: '7:00 PM',
    location: 'Living room blanket fort',
    category: 'cozy',
    status: 'completed',
    notes: 'Popcorn + Studio Ghibli films 🍿',
    created_at: new Date().toISOString(),
  },
];

export default function DatePlannerPage() {
  const navigate = useNavigate();
  const { profiles, currentUserRole } = useAppStore();
  const partnerName = profiles[currentUserRole === 'me' ? 'partner' : 'me'].display_name;

  const [dates, setDates] = useState<DatePlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_DATES;
    } catch {
      return INITIAL_DATES;
    }
  });

  const [activeTab, setActiveTab] = useState<'all' | 'planned' | 'idea' | 'completed'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<DatePlan['category']>('dinner');
  const [notes, setNotes] = useState('');

  const saveDates = (newDates: DatePlan[]) => {
    setDates(newDates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDates));
    } catch (err) {
      console.warn('Could not save dates:', err);
    }
  };

  const handleAddDate = () => {
    if (!title.trim()) return;
    const newPlan: DatePlan = {
      id: `date-${Date.now()}`,
      title: title.trim(),
      date: date || new Date().toISOString().split('T')[0],
      time: time.trim() || undefined,
      location: location.trim() || undefined,
      category,
      status: date ? 'planned' : 'idea',
      notes: notes.trim() || undefined,
      created_at: new Date().toISOString(),
    };

    saveDates([newPlan, ...dates]);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setCategory('dinner');
    setNotes('');
    setIsAddOpen(false);
  };

  const toggleStatus = (id: string) => {
    const updated = dates.map((d) => {
      if (d.id !== id) return d;
      const nextStatus: DatePlan['status'] = d.status === 'completed' ? 'planned' : 'completed';
      return { ...d, status: nextStatus };
    });
    saveDates(updated);
  };

  const deleteDate = (id: string) => {
    saveDates(dates.filter((d) => d.id !== id));
  };

  const filteredDates = dates.filter((d) => {
    if (activeTab === 'all') return true;
    return d.status === activeTab;
  });

  const categoryEmoji: Record<DatePlan['category'], string> = {
    dinner: '🍷',
    movie: '🎬',
    getaway: '✈️',
    cozy: '🛋️',
    adventure: '⛰️',
  };

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
              Date Planner <Sparkles className="h-4 w-4 text-rose-glow" />
            </h1>
            <p className="text-xs text-white/60">Special memories with {partnerName}</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          className="min-h-[44px] px-3.5 flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> New Date
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {(['all', 'planned', 'idea', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold capitalize transition-all min-h-[44px] shrink-0 ${
              activeTab === tab
                ? 'bg-rose-glow text-white shadow-glow-pink'
                : 'bg-white/5 text-white/65 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Dates List */}
      {filteredDates.length === 0 ? (
        <Card variant="glass" className="py-12">
          <EmptyState
            icon="🥂"
            title="No dates planned yet"
            description="Dream up your next romantic outing or cozy night in together."
            actionLabel="Plan a Date"
            onAction={() => setIsAddOpen(true)}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDates.map((plan) => (
            <Card
              key={plan.id}
              variant={plan.status === 'completed' ? 'glass' : 'glow'}
              className={`p-4 transition-all duration-300 ${
                plan.status === 'completed' ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleStatus(plan.id)}
                  className="mt-0.5 text-rose-soft hover:text-white transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
                >
                  {plan.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
                  ) : (
                    <Circle className="h-5 w-5 text-white/40" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryEmoji[plan.category]}</span>
                    <h3
                      className={`font-semibold text-sm text-white truncate ${
                        plan.status === 'completed' ? 'line-through text-white/50' : ''
                      }`}
                    >
                      {plan.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
                    {plan.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-rose-soft" />
                        {new Date(plan.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {plan.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-300" />
                        {plan.time}
                      </span>
                    )}
                    {plan.location && (
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="h-3 w-3 text-sky-400" />
                        {plan.location}
                      </span>
                    )}
                  </div>

                  {plan.notes && (
                    <p className="text-xs text-white/70 italic bg-white/5 rounded-lg p-2 mt-1">
                      "{plan.notes}"
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDate(plan.id)}
                  className="!p-2 text-white/30 hover:text-rose-400 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Date Sheet */}
      <Sheet open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Plan a Romantic Date 🌹">
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Date Title</label>
            <input
              type="text"
              placeholder="e.g. Sunset beach walk & gelato"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-rose-glow"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1">Time</label>
              <input
                type="text"
                placeholder="e.g. 7:30 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Location</label>
            <input
              type="text"
              placeholder="e.g. Skyline Lounge"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Category</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['dinner', 'movie', 'cozy', 'adventure', 'getaway'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-1 rounded-xl text-center text-xs font-medium border transition-all ${
                    category === cat
                      ? 'border-rose-glow bg-rose-glow/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  <div className="text-base mb-0.5">{categoryEmoji[cat]}</div>
                  <span className="capitalize text-[10px]">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1">Little Notes & Surprises</label>
            <textarea
              placeholder="What to wear, surprise flowers, or secret plans..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:border-rose-glow resize-none"
            />
          </div>

          <Button
            variant="primary"
            onClick={handleAddDate}
            disabled={!title.trim()}
            className="w-full min-h-[48px] mt-2 font-bold flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4 fill-current" /> Save Date
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
