import { motion } from 'framer-motion';
import { Camera, ImagePlus, Play, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { compressImage } from '@/features/media/compressor';
import { useAppStore } from '@/stores/useAppStore';

export default function GalleryPage() {
  const navigate = useNavigate();
  const {
    messages,
    world,
    addMemory,
    toggleFavoriteMemory,
    updateWorld,
    openMediaViewer,
  } = useAppStore();

  const [filter, setFilter] = useState<'all' | 'photos' | 'videos' | 'favorites'>('all');
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Combine saved gallery memories + all photos/videos shared in Chat
  const chatMediaItems = useMemo(
    () =>
      messages
        .filter((m) => !m.deleted_at && m.media && (m.kind === 'image' || m.kind === 'video'))
        .map((m) => ({
          id: `chat-${m.id}`,
          messageId: m.id,
          source: 'chat' as const,
          type: m.media!.type,
          url: m.media!.url,
          title: m.media!.caption || m.body || (m.kind === 'video' ? 'Video Snap' : 'Photo Snap'),
          date: m.created_at.slice(0, 10),
          favorite: m.reactions.length > 0,
        })),
    [messages]
  );

  const savedItems = useMemo(
    () =>
      world.memories.map((m) => ({
        id: m.id,
        messageId: null as string | null,
        source: 'saved' as const,
        type: 'image' as const,
        url: m.image_url,
        title: m.title,
        date: m.date,
        favorite: m.favorite,
      })),
    [world.memories]
  );

  const allItems = useMemo(() => {
    const merged = [...savedItems, ...chatMediaItems].sort((a, b) => b.date.localeCompare(a.date));
    return merged.filter((item) => {
      if (filter === 'photos' && item.type !== 'image') return false;
      if (filter === 'videos' && item.type !== 'video') return false;
      if (filter === 'favorites' && !item.favorite) return false;
      if (!query.trim()) return true;
      return item.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [savedItems, chatMediaItems, filter, query]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const existing = groups.get(item.date) ?? [];
      existing.push(item);
      groups.set(item.date, existing);
    }
    return Array.from(groups.entries());
  }, [allItems]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImage(file, 2048, 0.82);
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        if (!url) return;
        addMemory({
          title: file.name.replace(/\.[^.]+$/, '') || 'Saved Photo',
          date: new Date().toISOString().slice(0, 10),
          note: 'Added to Private Gallery',
          image_url: url,
          favorite: false,
        });
      };
      reader.readAsDataURL(compressed.blob);
    } catch {
      // Fallback if image decode fails
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-4 no-scrollbar">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold bg-love-gradient bg-clip-text text-transparent">Gallery</h1>
          <p className="text-xs text-white/60">Private photos &amp; snaps saved in your app</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/camera')}
            aria-label="Open Camera"
            className="h-9 w-9 rounded-2xl glass flex items-center justify-center text-rose-glow"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3.5 py-2 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center gap-1.5 shadow-glow-pink"
          >
            <ImagePlus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 rounded-2xl glass px-3.5 py-2 border border-white/10">
          <Search className="h-4 w-4 text-white/50 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your gallery…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-white/40"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {([
            { id: 'all', label: 'All' },
            { id: 'photos', label: 'Photos' },
            { id: 'videos', label: 'Videos' },
            { id: 'favorites', label: 'Favorites' },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === t.id ? 'bg-love-gradient text-white shadow-glow-pink' : 'glass text-white/65'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center space-y-2.5 border border-white/10">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-love-gradient-soft flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-rose-glow" />
          </div>
          <p className="text-sm font-semibold">Your private gallery is empty</p>
          <p className="text-xs text-white/55 max-w-xs mx-auto">
            Photos and snaps you send in Chat or capture with Camera appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50 px-1">
                {new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.01 }}
                    className="relative rounded-2xl overflow-hidden glass border border-white/10 aspect-square group cursor-pointer"
                    onClick={() => {
                      if (item.messageId) openMediaViewer(item.messageId);
                    }}
                  >
                    {item.type === 'video' ? (
                      <div className="relative h-full w-full bg-black">
                        <video src={item.url} className="h-full w-full object-cover" muted />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play className="h-8 w-8 text-white fill-white/80" />
                        </span>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                    )}

                    {item.source === 'saved' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteMemory(item.id);
                          }}
                          aria-label="Favorite"
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/55 flex items-center justify-center"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${item.favorite ? 'fill-amber-400 text-amber-400' : 'text-white'}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteId === item.id) {
                              updateWorld({ memories: world.memories.filter((m) => m.id !== item.id) });
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(item.id);
                            }
                          }}
                          aria-label="Delete"
                          className="absolute top-2 left-2 px-2 h-7 rounded-full bg-black/55 text-[10px] text-white/85 flex items-center gap-1"
                        >
                          {confirmDeleteId === item.id ? 'Confirm?' : <Trash2 className="h-3 w-3" />}
                        </button>
                      </>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <div className="text-[11px] font-medium text-white truncate">{item.title}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
