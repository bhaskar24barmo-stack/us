import { useState, useEffect } from 'react';
import {
  Calendar,
  Heart,
  Keyboard,
  Palette,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { Sheet } from '@/design-system/Sheet';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';

const SEEN_V2_KEY = 'onlyus.whats_new_v2_seen';

const V2_HIGHLIGHTS = [
  {
    icon: Palette,
    title: 'Handcrafted Design & Warm Cream Mode',
    desc: 'Switch between Midnight Rose Dark and cozy Warm Cream appearance modes with buttery-smooth animations.',
    color: 'text-pink-400 bg-pink-500/20',
  },
  {
    icon: Calendar,
    title: 'Date Planner & Shared Notes',
    desc: 'Plan romantic dinners, movie nights, and weekend getaways, plus shared lists and love notes.',
    color: 'text-amber-400 bg-amber-500/20',
  },
  {
    icon: Keyboard,
    title: 'System-Wide Couple Keyboard',
    desc: 'Send romantic GIFs, stickers, and quick love messages directly into WhatsApp, Telegram, and any app.',
    color: 'text-violet-400 bg-violet-500/20',
  },
  {
    icon: Smartphone,
    title: 'Android Home Screen Widget',
    desc: 'Keep your days in love counter and partner’s mood check-in right on your phone’s home screen.',
    color: 'text-rose-400 bg-rose-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable Messaging & One-Tap Backup',
    desc: 'Automatic offline retry queue, tap-to-retry outbox, and full encrypted ZIP export of your memories.',
    color: 'text-emerald-400 bg-emerald-500/20',
  },
];

interface WhatsNewSheetProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WhatsNewSheet({ forceOpen, onClose }: WhatsNewSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const seen = localStorage.getItem(SEEN_V2_KEY);
    if (!seen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(SEEN_V2_KEY, 'true');
    } catch (err) {
      console.warn('Could not persist seen status:', err);
    }
    setIsOpen(false);
    onClose?.();
  };

  return (
    <Sheet open={isOpen} onClose={handleDismiss} title="Welcome to ONLYUS v2 💖">
      <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto no-scrollbar">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-soft text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-rose-glow" /> Major Upgrade
          </div>
          <p className="text-xs text-white/70">
            A brand new chapter of private intimacy, crafted just for you two.
          </p>
        </div>

        <div className="space-y-2.5">
          {V2_HIGHLIGHTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} variant="glass" className="p-3.5 flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white mb-0.5">{item.title}</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          variant="primary"
          onClick={handleDismiss}
          className="w-full min-h-[48px] font-bold text-sm shadow-glow-pink flex items-center justify-center gap-2 mt-2"
        >
          <Heart className="h-4 w-4 fill-current" /> Let&apos;s Explore v2
        </Button>
      </div>
    </Sheet>
  );
}
