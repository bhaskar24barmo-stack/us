import { motion } from 'framer-motion';
import { Search, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { STICKER_CATALOG } from '@/data/demoData';
import { ANIMATED_GIF_CATALOG, searchAnimatedGifs, type AnimatedGifItem, type GifCategory } from '@/services/gifs';
import { useAppStore } from '@/stores/useAppStore';
import type { StickerCategory, StickerItem } from '@/types/models';

const CATEGORIES: Array<'All' | 'Favorites' | 'Recent' | StickerCategory> = [
  'All',
  'Favorites',
  'Recent',
  'Love',
  'Cute',
  'Funny',
  'Romantic',
  'Good morning',
  'Good night',
  'Hugs',
  'Kisses',
  'Hearts',
];

const QUICK_EMOJIS = [
  // Hearts & Love
  '❤️', '💖', '💘', '💜', '💞', '💓', '💗', '🫶',
  '😍', '🥰', '😘', '🥹', '🥺', '😚', '💋', '🫂',
  // Expressions & Fun
  '😂', '🤣', '😊', '🤭', '🙈', '😮‍💨', '🫠', '🤩',
  '😴', '🤪', '👀', '✨', '💫', '🔥', '🎉', '🦋',
  // Nature & Cozy
  '🌙', '⭐', '🌌', '☀️', '🌅', '🌈', '🌹', '💐',
  '🌸', '🍓', '🍒', '☕', '🍵', '🍫', '🍿', '🥂',
  // Moments & Gestures
  '🚗', '🎧', '🎶', '📸', '💌', '🎁', '🧸', '♾️',
  '🙌', '🤞', '👌', '💯', '👑', '🫧', '🛋️', '🏡',
];

export function StickerCard({ sticker, size = 'md' }: { sticker: StickerItem; size?: 'sm' | 'md' | 'lg' }) {
  const anim =
    sticker.animation === 'bounce'
      ? { y: [0, -6, 0] }
      : sticker.animation === 'pulse'
      ? { scale: [1, 1.12, 1] }
      : sticker.animation === 'wiggle'
      ? { rotate: [-6, 6, -6] }
      : sticker.animation === 'spin'
      ? { rotate: [0, 360] }
      : { y: [0, -4, 0], rotate: [-2, 2, -2] };

  const dims = size === 'lg' ? 'h-24 w-24 text-5xl' : size === 'sm' ? 'h-12 w-12 text-2xl' : 'h-16 w-16 text-3xl';

  return (
    <motion.div
      animate={anim}
      transition={{ duration: sticker.animation === 'spin' ? 6 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className={`${dims} rounded-2xl bg-gradient-to-br ${sticker.gradient} flex items-center justify-center shadow-glow-pink border border-white/20 select-none`}
    >
      {sticker.emoji}
    </motion.div>
  );
}

interface StickerPickerProps {
  onSelectSticker: (sticker: StickerItem) => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (gif: AnimatedGifItem) => void;
  onClose: () => void;
}

const GIF_CATEGORIES: GifCategory[] = ['All', 'Love', 'Hugs', 'Kisses', 'Cute', 'Night'];

export default function StickerPicker({
  onSelectSticker,
  onSelectEmoji,
  onSelectGif,
  onClose,
}: StickerPickerProps) {
  const [tab, setTab] = useState<'stickers' | 'emojis' | 'gifs'>('stickers');
  const [cat, setCat] = useState<'All' | 'Favorites' | 'Recent' | StickerCategory>('All');
  const [gifCat, setGifCat] = useState<GifCategory>('All');
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<AnimatedGifItem[]>(ANIMATED_GIF_CATALOG);
  const { favoriteStickers, recentStickers, toggleFavoriteSticker } = useAppStore();

  useEffect(() => {
    let active = true;
    void searchAnimatedGifs(gifQuery, gifCat).then((items) => {
      if (active) setGifResults(items);
    });
    return () => {
      active = false;
    };
  }, [gifQuery, gifCat]);

  const filteredStickers = STICKER_CATALOG.filter((s) => {
    if (cat === 'All') return true;
    if (cat === 'Favorites') return favoriteStickers.includes(s.id);
    if (cat === 'Recent') return recentStickers.includes(s.id);
    return s.category === cat;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass-strong rounded-3xl p-3.5 shadow-glass border border-white/15"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex gap-1.5">
          {(['stickers', 'emojis', 'gifs'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                tab === t ? 'bg-love-gradient text-white shadow-glow-pink' : 'bg-white/5 text-white/65'
              }`}
            >
              {t === 'gifs' ? 'GIF Cards' : t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close picker"
          className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === 'stickers' && (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                  cat === c ? 'bg-rose-glow/25 text-rose-soft border border-rose-glow/40' : 'bg-white/5 text-white/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {filteredStickers.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/50">
              No stickers in {cat} yet. Tap the star on any sticker to favorite it!
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 max-h-52 overflow-y-auto no-scrollbar p-1">
              {filteredStickers.map((stk) => {
                const isFav = favoriteStickers.includes(stk.id);
                return (
                  <div key={stk.id} className="relative group flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => onSelectSticker(stk)}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-2xl hover:bg-white/10 transition-colors"
                    >
                      <StickerCard sticker={stk} size="sm" />
                      <span className="text-[10px] text-white/70 truncate max-w-[64px]">{stk.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteSticker(stk.id);
                      }}
                      aria-label="Favorite sticker"
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white/70 hover:text-amber-300"
                    >
                      <Star className={`h-3 w-3 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'emojis' && (
        <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto p-1">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => onSelectEmoji(em)}
              className="h-10 rounded-xl text-xl hover:bg-white/10 active:scale-90 transition-transform"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {tab === 'gifs' && (
        <div className="space-y-2">
          {/* Keyboard-style GIF Search Bar */}
          <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-white/50 shrink-0" />
            <input
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              placeholder="Search animated GIFs…"
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-white/40"
            />
            {gifQuery && (
              <button
                type="button"
                onClick={() => setGifQuery('')}
                className="text-[11px] text-white/55 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {GIF_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setGifCat(c)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                  gifCat === c ? 'bg-rose-glow/25 text-rose-soft border border-rose-glow/40' : 'bg-white/5 text-white/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Animated GIF Grid */}
          {gifResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/50">
              No GIFs matching "{gifQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-0.5">
              {gifResults.map((g) => (
                <motion.button
                  key={g.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelectGif(g)}
                  className="relative rounded-2xl overflow-hidden border border-white/15 bg-ink-900/60 group aspect-[16/11]"
                >
                  <img src={g.url} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-[9px] font-bold tracking-wider text-white">
                    GIF
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
