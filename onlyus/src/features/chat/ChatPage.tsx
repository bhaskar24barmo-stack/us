import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  BarChart2,
  Bell,
  BookmarkPlus,
  Camera,
  Check,
  CheckCheck,
  Copy,
  Edit3,
  EyeOff,
  Heart,
  HeartPulse,
  ImagePlus,
  Mic,
  Music,
  Phone,
  Pin,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Timer,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STICKER_CATALOG } from '@/data/demoData';
import VoiceMessagePlayer from '@/features/chat/VoiceMessagePlayer';
import VoiceRecorderBar from '@/features/chat/VoiceRecorderBar';
import { StickerCard } from '@/features/stickers/StickerPicker';
import StickerPicker from '@/features/stickers/StickerPicker';
import { ANIMATED_GIF_CATALOG } from '@/services/gifs';
import { useAppStore } from '@/stores/useAppStore';
import type { Message } from '@/types/models';

const REACTION_CHOICES = ['❤️', '🔥', '🥹', '😂', '💘', '🫂'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatPage({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const navigate = useNavigate();
  const {
    currentUserRole,
    profiles,
    messages,
    partnerTyping,
    notifications,
    world,
    settings,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePin,
    votePoll,
    revealWhisper,
    setMyVibe,
    addMemory,
    markAllRead,
    simulatePartnerReply,
    simulatePartnerSticker,
    purgeExpiredMessages,
    sendHeartbeat,
    openMediaViewer,
    startCall,
  } = useAppStore();

  const role = currentUserRole ?? 'me';
  const partnerRole = role === 'me' ? 'partner' : 'me';
  const me = profiles[role];
  const partner = profiles[partnerRole];

  const [text, setText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [floatingHeartKey, setFloatingHeartKey] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    type: 'image' | 'video';
    name: string;
  } | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [ttlSec, setTtlSec] = useState<number | null>(null);
  const [, setNowTick] = useState(Date.now());
  const [doubleTapHeartId, setDoubleTapHeartId] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQ, setPollQ] = useState('What should we do tonight?');
  const [pollOpt1, setPollOpt1] = useState('Movie & snacks 🍿');
  const [pollOpt2, setPollOpt2] = useState('Late night drive 🚗');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    markAllRead();
  }, [messages.length, markAllRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, partnerTyping]);

  const hasExpiring = useMemo(() => messages.some((m) => Boolean(m.expires_at)), [messages]);
  useEffect(() => {
    if (!hasExpiring) return;
    const t = setInterval(() => {
      setNowTick(Date.now());
      purgeExpiredMessages();
    }, 1000);
    return () => clearInterval(t);
  }, [hasExpiring, purgeExpiredMessages]);

  const pinnedMessage = useMemo(
    () => messages.find((m) => m.pinned_at && !m.deleted_at) ?? null,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.body?.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();

    if (pendingAttachment) {
      sendMessage({
        kind: pendingAttachment.type,
        body: trimmed || null,
        media: {
          id: `med-${Date.now()}`,
          type: pendingAttachment.type,
          url: pendingAttachment.url,
          caption: trimmed || pendingAttachment.name,
          isObjectUrl: true,
        },
        reply_to_id: replyTo?.id ?? null,
        ttlSec,
      });
      setPendingAttachment(null);
      setText('');
      setReplyTo(null);
      setPickerOpen(false);
      return;
    }

    if (!trimmed) return;

    if (editingMsg) {
      editMessage(editingMsg.id, trimmed);
      setEditingMsg(null);
      setText('');
      return;
    }

    sendMessage({
      kind: 'text',
      body: trimmed,
      reply_to_id: replyTo?.id ?? null,
      ttlSec,
    });
    setText('');
    setReplyTo(null);
    setPickerOpen(false);
  }

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.url);
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');
    setPendingAttachment({ url, type: isVideo ? 'video' : 'image', name: file.name });
    e.target.value = '';
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 180);
  }

  const bubbleGradient =
    settings.chatTheme === 'electric-violet'
      ? 'from-violet-600 to-indigo-600'
      : settings.chatTheme === 'aurora-velvet'
      ? 'from-fuchsia-600 to-purple-700'
      : settings.chatTheme === 'sunset-blush'
      ? 'from-rose-500 to-amber-500'
      : 'from-[#ff4d8d] to-[#8b5cf6]';

  return (
    <div className="flex flex-col h-full pb-24 relative">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center text-xl shadow-glow-pink"
              style={{ background: `linear-gradient(135deg, ${partner.accent_color}, #8b5cf6)` }}
            >
              {partner.avatar_emoji}
            </div>
            {partner.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-ink-950" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base truncate">{partner.display_name}</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-glow/20 text-rose-soft border border-rose-glow/30 shrink-0">
                🔥 {world.streakDays}d
              </span>
            </div>
            <p className="text-[11px] text-white/60 truncate">
              {partnerTyping ? 'typing…' : partner.status_text}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={sendHeartbeat}
            aria-label="Send heartbeat pulse"
            title="Send live heartbeat"
            className="h-9 w-9 rounded-xl glass flex items-center justify-center text-rose-glow hover:bg-rose-glow/15"
          >
            <HeartPulse className="h-4 w-4" />
          </motion.button>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search messages"
            className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={() => startCall('voice')}
            aria-label="Voice call"
            className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-rose-glow"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => startCall('video')}
            aria-label="Video call"
            className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-violet-glow"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-glow text-[10px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Search & Pinned Bars */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 glass border-b border-white/10 flex items-center gap-2 overflow-hidden"
          >
            <Search className="h-4 w-4 text-white/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your private messages..."
              className="flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-xs text-white/60">
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {pinnedMessage && (
        <div className="px-4 py-2 bg-violet-glow/15 border-b border-violet-glow/25 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Pin className="h-3.5 w-3.5 text-rose-glow shrink-0" />
            <span className="truncate text-white/85">
              Pinned: {pinnedMessage.body || pinnedMessage.media?.caption || 'Media memory'}
            </span>
          </div>
          <button onClick={() => togglePin(pinnedMessage.id)} className="text-white/60 hover:text-white">
            Unpin
          </button>
        </div>
      )}

      {/* Demo simulate reply bar */}
      <div className="px-4 pt-2 flex items-center justify-between gap-2 text-[11px] text-white/50">
        <span className="truncate">Private Prototype • Local Demo</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => simulatePartnerReply()}
            className="px-2.5 py-1 rounded-full glass hover:border-rose-glow/40 text-rose-soft flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" /> {partner.display_name} Text
          </button>
          <button
            onClick={() => simulatePartnerSticker()}
            className="px-2.5 py-1 rounded-full glass hover:border-violet-glow/40 text-violet-300 flex items-center gap-1"
          >
            💖 Sticker
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div
        ref={listRef}
        onScroll={handleListScroll}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 no-scrollbar relative"
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-2">
            <div className="text-4xl">🔍</div>
            <p className="text-sm font-medium">
              {searchQuery ? `No messages matching "${searchQuery}"` : 'No messages yet'}
            </p>
            <p className="text-xs text-white/55">
              {searchQuery
                ? 'Try searching for another word or clear the filter.'
                : `Send your first sweet note to ${partner.display_name}.`}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
          const isMe = msg.sender_id === me.id;
          const prev = filteredMessages[idx - 1];
          const showDay = !prev || formatDayLabel(prev.created_at) !== formatDayLabel(msg.created_at);
          const replyTarget = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;
          const sticker = msg.sticker_id ? STICKER_CATALOG.find((s) => s.id === msg.sticker_id) : null;
          const gifSrc =
            msg.gif_url ??
            (msg.gif_id ? ANIMATED_GIF_CATALOG.find((g) => g.id === msg.gif_id)?.url : null);
          const remainingSec = msg.expires_at
            ? Math.max(0, Math.ceil((new Date(msg.expires_at).getTime() - Date.now()) / 1000))
            : null;

          return (
            <div key={msg.id} id={`msg-${msg.id}`}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="px-3 py-0.5 rounded-full glass text-[11px] text-white/60">
                    {formatDayLabel(msg.created_at)}
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                  onDoubleClick={() => {
                    if (msg.deleted_at) return;
                    toggleReaction(msg.id, '❤️');
                    setDoubleTapHeartId(msg.id);
                    setTimeout(() => setDoubleTapHeartId(null), 700);
                  }}
                  className={`relative max-w-[82%] sm:max-w-[70%] cursor-pointer group ${
                    msg.deleted_at
                      ? 'glass rounded-2xl px-3.5 py-2 italic text-white/45 text-xs'
                      : msg.kind === 'sticker'
                      ? 'p-1'
                      : msg.kind === 'love_note'
                      ? 'rounded-3xl p-4 bg-gradient-to-br from-rose-500/25 to-violet-600/30 border border-rose-glow/40 shadow-glow-pink'
                      : isMe
                      ? `rounded-3xl rounded-br-md px-4 py-2.5 bg-gradient-to-br ${bubbleGradient} text-white shadow-glow-pink`
                      : 'rounded-3xl rounded-bl-md px-4 py-2.5 glass text-white'
                  }`}
                >
                  {msg.deleted_at ? (
                    <span>This message was unsent</span>
                  ) : (
                    <>
                      {replyTarget && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            document
                              .getElementById(`msg-${replyTarget.id}`)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="mb-1.5 pl-2.5 border-l-2 border-white/40 text-[11px] text-white/75 truncate block text-left w-full hover:text-white"
                        >
                          Replying to: {replyTarget.body || 'Media'}
                        </button>
                      )}

                      {doubleTapHeartId === msg.id && (
                        <motion.div
                          initial={{ scale: 0.4, opacity: 1 }}
                          animate={{ scale: 1.5, y: -24, opacity: 0 }}
                          transition={{ duration: 0.65 }}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl z-30"
                        >
                          ❤️
                        </motion.div>
                      )}

                      {msg.kind === 'love_note' && (
                        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-rose-soft mb-1 font-semibold">
                          <Heart className="h-3 w-3 fill-rose-glow text-rose-glow" /> Love Note
                        </div>
                      )}

                      {msg.kind === 'sticker' && sticker && <StickerCard sticker={sticker} size="lg" />}

                      {msg.kind === 'gif' && gifSrc && (
                        <div className="relative overflow-hidden rounded-2xl border border-white/20 w-52 sm:w-60 bg-ink-900/60">
                          <img
                            src={gifSrc}
                            alt={msg.gif_title || 'Animated GIF'}
                            className="w-full h-auto object-cover block"
                          />
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 text-[9px] font-bold tracking-wider text-white">
                            GIF
                          </span>
                        </div>
                      )}

                      {msg.media && (msg.kind === 'image' || msg.kind === 'video') && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openMediaViewer(msg.id);
                          }}
                          className="mb-1.5 overflow-hidden rounded-2xl border border-white/15"
                        >
                          {msg.kind === 'image' ? (
                            <img
                              src={msg.media.url}
                              alt={msg.media.caption || 'Shared photo'}
                              className="max-h-60 w-full object-cover"
                            />
                          ) : (
                            <video src={msg.media.url} className="max-h-60 w-full object-cover" muted />
                          )}
                        </div>
                      )}

                      {msg.kind === 'voice' && msg.media && (
                        <VoiceMessagePlayer url={msg.media.url} durationSec={msg.media.durationSec} />
                      )}

                      {msg.kind === 'poll' && msg.poll && (
                        <div className="space-y-2 min-w-[210px]">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <BarChart2 className="h-3.5 w-3.5 text-rose-soft" /> {msg.poll.question}
                          </div>
                          <div className="space-y-1.5">
                            {msg.poll.options.map((opt) => {
                              const total = msg.poll!.options.reduce((s, o) => s + o.votes.length, 0);
                              const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                              const voted = opt.votes.includes(me.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    votePoll(msg.id, opt.id);
                                  }}
                                  className={`relative w-full text-left rounded-xl px-3 py-1.5 text-xs overflow-hidden border transition-colors ${
                                    voted ? 'border-white/50 bg-white/15' : 'border-white/15 bg-black/20'
                                  }`}
                                >
                                  <span
                                    className="absolute inset-y-0 left-0 bg-white/15 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <span className="relative z-10 flex items-center justify-between gap-2">
                                    <span>{opt.label}</span>
                                    <span className="text-[10px] opacity-80">{pct}%</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {msg.kind === 'whisper' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!msg.revealed) revealWhisper(msg.id);
                          }}
                          className={`text-left w-full rounded-2xl p-3 border transition-all ${
                            msg.revealed
                              ? 'bg-violet-glow/15 border-violet-glow/35'
                              : 'bg-white/5 border-white/20 backdrop-blur-md'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-rose-soft font-semibold mb-1">
                            <EyeOff className="h-3 w-3" /> {msg.revealed ? 'Secret Whisper Revealed' : 'Secret Whisper • Tap to reveal'}
                          </div>
                          <p
                            className={`text-sm leading-relaxed transition-all duration-300 ${
                              msg.revealed ? 'blur-0 opacity-100' : 'blur-sm select-none opacity-65'
                            }`}
                          >
                            {msg.body}
                          </p>
                        </button>
                      )}

                      {msg.kind === 'song' && msg.song && (
                        <div className="rounded-2xl bg-black/30 border border-white/15 p-3 flex items-center gap-3 min-w-[210px]">
                          <div className="h-10 w-10 rounded-xl bg-love-gradient flex items-center justify-center shrink-0 shadow-glow-pink">
                            <Music className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-rose-soft font-semibold">
                              Dedicated to you
                            </div>
                            <div className="text-xs font-bold truncate">{msg.song.title}</div>
                            <div className="text-[11px] text-white/60 truncate">{msg.song.artist}</div>
                          </div>
                          <div className="flex items-end gap-0.5 h-5 shrink-0">
                            {[0, 1, 2, 3].map((bar) => (
                              <motion.span
                                key={bar}
                                animate={{ height: ['25%', '95%', '40%', '85%', '25%'] }}
                                transition={{ duration: 1.1 + bar * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                                className="w-1 rounded-full bg-rose-glow"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.body && msg.kind !== 'voice' && msg.kind !== 'whisper' && msg.kind !== 'song' && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/65">
                        {remainingSec !== null && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-mono text-[9px]">
                            ⏳ {remainingSec}s
                          </span>
                        )}
                        {msg.edited_at && <span>edited</span>}
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe &&
                          (msg.read_at ? (
                            <CheckCheck className="h-3 w-3 text-sky-300" />
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Reactions Row */}
                {msg.reactions.length > 0 && (
                  <motion.div
                    key={`${msg.id}-${msg.reactions.length}-${floatingHeartKey}`}
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="flex gap-1 -mt-1.5 px-2 z-10"
                  >
                    {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((em) => (
                      <button
                        key={em}
                        onClick={() => toggleReaction(msg.id, em)}
                        className="px-1.5 py-0.5 rounded-full glass-strong text-xs shadow-sm border border-white/15"
                      >
                        {em}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Quick Action Popover */}
                <AnimatePresence>
                  {activeMenuId === msg.id && !msg.deleted_at && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-1.5 glass-strong rounded-2xl p-2 flex items-center gap-1.5 shadow-glass z-20"
                    >
                      {REACTION_CHOICES.map((em) => (
                        <button
                          key={em}
                          onClick={() => {
                            toggleReaction(msg.id, em);
                            setFloatingHeartKey((k) => k + 1);
                            setActiveMenuId(null);
                          }}
                          className="h-7 w-7 rounded-full hover:bg-white/15 text-sm transition-transform hover:scale-125"
                        >
                          {em}
                        </button>
                      ))}
                      <span className="w-px h-4 bg-white/15 mx-0.5" />
                      <button
                        onClick={() => {
                          setReplyTo(msg);
                          setActiveMenuId(null);
                        }}
                        aria-label="Reply"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/75"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          togglePin(msg.id);
                          setActiveMenuId(null);
                        }}
                        aria-label="Pin"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/75"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      {msg.body && (
                        <button
                          onClick={() => {
                            void navigator.clipboard?.writeText(msg.body || '');
                            setCopiedId(msg.id);
                            setTimeout(() => setCopiedId(null), 1500);
                            setActiveMenuId(null);
                          }}
                          aria-label="Copy"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/75"
                        >
                          {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {msg.media?.type === 'image' && (
                        <button
                          onClick={() => {
                            addMemory({
                              title: msg.body || 'Chat Snapshot',
                              date: new Date().toISOString().slice(0, 10),
                              note: 'Saved from private chat',
                              image_url: msg.media!.url,
                              favorite: true,
                            });
                            setActiveMenuId(null);
                          }}
                          aria-label="Save to Memories"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-rose-soft"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isMe && msg.kind === 'text' && (
                        <button
                          onClick={() => {
                            setEditingMsg(msg);
                            setText(msg.body ?? '');
                            setActiveMenuId(null);
                          }}
                          aria-label="Edit"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/75"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isMe && (
                        <button
                          onClick={() => {
                            deleteMessage(msg.id);
                            setActiveMenuId(null);
                          }}
                          aria-label="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })
        )}

        {partnerTyping && (
          <div className="flex items-center gap-1.5 glass rounded-2xl px-4 py-2.5 w-fit">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.16 }}
                className="h-2 w-2 rounded-full bg-rose-glow"
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Scroll to Bottom Floating Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Scroll to latest message"
            className="absolute right-5 bottom-40 z-20 h-9 w-9 rounded-full glass-strong border border-rose-glow/40 shadow-glow-pink flex items-center justify-center text-white"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer Area */}
      <div className="px-3 pb-2 space-y-2">
        <AnimatePresence>
          {pollOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="glass-strong rounded-3xl p-3.5 space-y-2 border border-rose-glow/30"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-rose-soft">
                  <BarChart2 className="h-3.5 w-3.5" /> Couple Mini-Poll
                </span>
                <button type="button" onClick={() => setPollOpen(false)}>
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>
              <input
                value={pollQ}
                onChange={(e) => setPollQ(e.target.value)}
                placeholder="Ask a question…"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={pollOpt1}
                  onChange={(e) => setPollOpt1(e.target.value)}
                  placeholder="Option 1"
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs outline-none"
                />
                <input
                  value={pollOpt2}
                  onChange={(e) => setPollOpt2(e.target.value)}
                  placeholder="Option 2"
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!pollQ.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;
                  sendMessage({
                    kind: 'poll',
                    poll: {
                      question: pollQ.trim(),
                      options: [
                        { id: 'opt-1', label: pollOpt1.trim(), votes: [] },
                        { id: 'opt-2', label: pollOpt2.trim(), votes: [] },
                      ],
                    },
                  });
                  setPollOpen(false);
                }}
                className="w-full py-2 rounded-xl bg-love-gradient text-xs font-semibold text-white"
              >
                Send Poll
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!pickerOpen && !pollOpen && !recordingVoice && !pendingAttachment && !text && !replyTo && !editingMsg && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() =>
                sendMessage({
                  kind: 'whisper',
                  body: `Psst ${partner.display_name}… I’m smiling just thinking about you right now 🤫💜`,
                  ttlSec,
                })
              }
              className="shrink-0 px-3 py-1 rounded-full bg-violet-glow/20 border border-violet-glow/35 text-[11px] text-violet-200 hover:bg-violet-glow/30 transition-colors"
            >
              🤫 Secret Whisper
            </button>
            <button
              type="button"
              onClick={() =>
                sendMessage({
                  kind: 'song',
                  song: { title: 'Until I Found You', artist: 'Stephen Sanchez' },
                  ttlSec,
                })
              }
              className="shrink-0 px-3 py-1 rounded-full bg-rose-glow/15 border border-rose-glow/30 text-[11px] text-rose-soft hover:bg-rose-glow/25 transition-colors"
            >
              🎵 Dedicate Song
            </button>
            {['Miss you 🥺', 'On my way 🚗', 'Call me? 📞', 'Goodnight 🌙', 'Love you 💖'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage({ kind: 'text', body: chip })}
                className="shrink-0 px-3 py-1 rounded-full glass text-[11px] text-white/80 hover:border-rose-glow/40 hover:text-white transition-colors"
              >
                {chip}
              </button>
            ))}
            {['Cozy ☕', 'Listening 🎧', 'Missing you 🥺'].map((vibe) => (
              <button
                key={vibe}
                type="button"
                onClick={() => setMyVibe(vibe)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] border transition-colors ${
                  me.status_text === vibe
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                Vibe: {vibe}
              </button>
            ))}
          </div>
        )}
        {pendingAttachment && (
          <div className="glass-strong rounded-2xl p-2.5 flex items-center gap-3 border border-rose-glow/30">
            <div className="h-14 w-14 rounded-xl overflow-hidden bg-black/40 shrink-0">
              {pendingAttachment.type === 'image' ? (
                <img src={pendingAttachment.url} alt="Attachment preview" className="h-full w-full object-cover" />
              ) : (
                <video src={pendingAttachment.url} className="h-full w-full object-cover" muted />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{pendingAttachment.name}</div>
              <div className="text-[10px] text-rose-soft">Add a caption below or tap Send</div>
            </div>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(pendingAttachment.url);
                setPendingAttachment(null);
              }}
              aria-label="Remove attachment"
              className="h-8 w-8 rounded-full glass flex items-center justify-center text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <AnimatePresence>
          {pickerOpen && (
            <StickerPicker
              onSelectSticker={(stk) => {
                sendMessage({ kind: 'sticker', sticker_id: stk.id, ttlSec });
                setPickerOpen(false);
              }}
              onSelectEmoji={(em) => setText((t) => t + em)}
              onSelectGif={(gif) => {
                sendMessage({
                  kind: 'gif',
                  gif_id: gif.id,
                  gif_url: gif.url,
                  gif_title: gif.title,
                  ttlSec,
                });
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </AnimatePresence>

        {(replyTo || editingMsg) && (
          <div className="glass rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs">
            <span className="truncate text-white/80">
              {editingMsg ? `Editing: ${editingMsg.body}` : `Replying to: ${replyTo?.body || 'Media'}`}
            </span>
            <button
              onClick={() => {
                setReplyTo(null);
                setEditingMsg(null);
                if (editingMsg) setText('');
              }}
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>
        )}

        {recordingVoice ? (
          <VoiceRecorderBar
            onSend={(url, durationSec) => {
              sendMessage({
                kind: 'voice',
                media: { id: `voc-${Date.now()}`, type: 'voice', url, durationSec, isObjectUrl: true },
              });
              setRecordingVoice(false);
            }}
            onCancel={() => setRecordingVoice(false)}
          />
        ) : (
          <form onSubmit={handleSend} className="glass-strong rounded-[26px] p-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/camera')}
              aria-label="Open camera"
              className="h-10 w-10 rounded-full bg-love-gradient text-white flex items-center justify-center shrink-0 shadow-glow-pink"
            >
              <Camera className="h-4 w-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileAttach}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach photo or video"
              className="h-9 w-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 shrink-0"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a message…"
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/40 min-w-0"
            />

            <button
              type="button"
              onClick={() => {
                setPollOpen((v) => !v);
                setPickerOpen(false);
              }}
              aria-label="Create couple poll"
              className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                pollOpen ? 'bg-rose-glow/25 text-rose-glow' : 'text-white/65 hover:bg-white/10'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setTtlSec((cur) => (cur === null ? 10 : cur === 10 ? 30 : null))}
              aria-label="Disappearing message timer"
              title="Toggle disappearing message timer"
              className={`h-8 px-2 rounded-full flex items-center gap-1 shrink-0 text-[10px] font-semibold transition-colors ${
                ttlSec ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40' : 'text-white/60 hover:bg-white/10'
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              {ttlSec ? `${ttlSec}s` : '∞'}
            </button>

            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Stickers and emojis"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                pickerOpen ? 'bg-rose-glow/25 text-rose-glow' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <Smile className="h-4 w-4" />
            </button>

            {text.trim() || pendingAttachment ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="submit"
                aria-label="Send message"
                className="h-10 w-10 rounded-full bg-love-gradient text-white flex items-center justify-center shrink-0 shadow-glow-pink"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => setRecordingVoice(true)}
                aria-label="Record voice note"
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-rose-glow/25 text-white flex items-center justify-center shrink-0"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
