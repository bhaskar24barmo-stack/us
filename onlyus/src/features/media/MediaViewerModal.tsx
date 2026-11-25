import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkPlus, ChevronLeft, ChevronRight, Heart, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export default function MediaViewerModal() {
  const {
    viewerMessageId,
    messages,
    closeMediaViewer,
    openMediaViewer,
    toggleReaction,
    deleteMessage,
    addMemory,
    pushNotification,
  } = useAppStore();

  const [zoom, setZoom] = useState(1);

  const mediaMessages = useMemo(
    () => messages.filter((m) => !m.deleted_at && m.media && (m.kind === 'image' || m.kind === 'video')),
    [messages]
  );

  const currentIdx = mediaMessages.findIndex((m) => m.id === viewerMessageId);
  const current = currentIdx >= 0 ? mediaMessages[currentIdx] : null;

  if (!viewerMessageId || !current || !current.media) return null;

  function goPrev() {
    if (currentIdx > 0) {
      setZoom(1);
      openMediaViewer(mediaMessages[currentIdx - 1].id);
    }
  }

  function goNext() {
    if (currentIdx < mediaMessages.length - 1) {
      setZoom(1);
      openMediaViewer(mediaMessages[currentIdx + 1].id);
    }
  }

  function handleSaveToGallery() {
    if (!current?.media) return;
    addMemory({
      title: current.media.caption || 'Saved Chat Moment',
      date: current.created_at.slice(0, 10),
      note: current.body || 'Saved from your private chat',
      image_url: current.media.url,
      favorite: true,
    });
    pushNotification('photo', 'Saved to Our World 💖', 'Added to your shared memories gallery.');
  }

  function handleDelete() {
    if (!current) return;
    if (current.media?.isObjectUrl) {
      URL.revokeObjectURL(current.media.url);
    }
    deleteMessage(current.id);
    closeMediaViewer();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 z-10">
          <button
            onClick={closeMediaViewer}
            aria-label="Close viewer"
            className="h-10 w-10 rounded-full glass flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>

          <span className="text-xs text-white/65">
            {currentIdx + 1} / {mediaMessages.length}
          </span>

          <div className="flex gap-2">
            {current.kind === 'image' && (
              <button
                onClick={() => setZoom((z) => (z === 1 ? 1.8 : 1))}
                aria-label="Toggle zoom"
                className="h-10 w-10 rounded-full glass flex items-center justify-center"
              >
                {zoom > 1 ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={handleSaveToGallery}
              aria-label="Save to gallery"
              className="h-10 w-10 rounded-full glass flex items-center justify-center text-rose-soft"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete media"
              className="h-10 w-10 rounded-full glass flex items-center justify-center text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Media Canvas */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden px-4">
          {currentIdx > 0 && (
            <button
              onClick={goPrev}
              aria-label="Previous media"
              className="absolute left-3 z-10 h-10 w-10 rounded-full glass-strong flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {current.kind === 'image' ? (
            <motion.img
              key={current.id}
              src={current.media.url}
              alt={current.media.caption || 'Media'}
              animate={{ scale: zoom }}
              onDoubleClick={() => setZoom((z) => (z === 1 ? 1.8 : 1))}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain cursor-zoom-in"
            />
          ) : (
            <video
              key={current.id}
              src={current.media.url}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-2xl"
            />
          )}

          {currentIdx < mediaMessages.length - 1 && (
            <button
              onClick={goNext}
              aria-label="Next media"
              className="absolute right-3 z-10 h-10 w-10 rounded-full glass-strong flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Caption & Reactions */}
        <div className="p-4 glass-strong border-t border-white/10 space-y-2.5">
          {(current.media.caption || current.body) && (
            <p className="text-sm text-center text-white/90">{current.media.caption || current.body}</p>
          )}
          <div className="flex items-center justify-center gap-2">
            {['❤️', '🔥', '🥹', '💘'].map((em) => (
              <button
                key={em}
                onClick={() => toggleReaction(current.id, em)}
                className="px-3 py-1.5 rounded-full glass hover:bg-white/15 text-sm flex items-center gap-1"
              >
                {em}
              </button>
            ))}
            <span className="text-xs text-white/50 flex items-center gap-1 ml-2">
              <Heart className="h-3.5 w-3.5 text-rose-glow" /> {current.reactions.length}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
