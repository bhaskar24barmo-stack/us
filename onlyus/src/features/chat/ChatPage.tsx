import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  BarChart2,
  Bell,
  BookmarkCheck,
  BookmarkPlus,
  Camera,
  Check,
  ChevronLeft,
  Copy,
  Edit3,
  EyeOff,
  Flame,
  Heart,
  HeartPulse,
  ImagePlus,
  Mic,
  Music,
  Phone,
  Pin,
  Play,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONVERSATION_ID, STICKER_CATALOG } from '@/data/demoData';
import { uploadPrivateMedia } from '@/services/mediaStorage';
import AvatarBubble from '@/components/AvatarBubble';
import LoveStormOverlay from '@/components/LoveStormOverlay';
import SnapPeekingAvatar from '@/components/SnapPeekingAvatar';
import SnapViewModal from '@/components/SnapViewModal';
import VoiceMessagePlayer from '@/features/chat/VoiceMessagePlayer';
import VoiceRecorderBar from '@/features/chat/VoiceRecorderBar';
import { StickerCard } from '@/features/stickers/StickerPicker';
import StickerPicker from '@/features/stickers/StickerPicker';
import { ANIMATED_GIF_CATALOG } from '@/services/gifs';
import { flushOutbox, enqueueOutbox } from '@/features/chat/outbox';
import { sendOutboxMessageToSupabase } from '@/services/chatSync';
import { formatWhatsAppLastSeen, OpenPresenceClient } from '@/services/presence';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import type { Message } from '@/types/models';

const REACTION_CHOICES = ['❤️', '🔥', '🥹', '😂', '💘', '🫂'];

function renderSafeTextWithLinks(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return parts.map((part, idx) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={idx}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline text-sky-200 hover:text-white break-all"
      >
        {part}
      </a>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase();
}

export default function ChatPage({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const navigate = useNavigate();
  const {
    currentUserRole,
    pairCode,
    profiles,
    messages,
    partnerTyping,
    notifications,
    settings,
    sendMessage,
    receiveLiveMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePin,
    toggleSaveInChat,
    markSnapViewed,
    votePoll,
    revealWhisper,
    setMyVibe,
    addMemory,
    markAllRead,
    purgeExpiredMessages,
    sendHeartbeat,
    updateProfile,
    openMediaViewer,
    startCall,
    syncRemoteMessages,
    world,
  } = useAppStore();

  const role = currentUserRole ?? 'me';
  const partnerRole = role === 'me' ? 'partner' : 'me';
  const me = profiles[role];
  const partner = profiles[partnerRole];

  const streakCount = Math.max(1, world?.streakDays || 1);
  const [streakToast, setStreakToast] = useState(false);
  const [viewingSnap, setViewingSnap] = useState<Message | null>(null);

  const [text, setText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [floatingHeartKey, setFloatingHeartKey] = useState(0);
  const [stormKey, setStormKey] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    url: string;
    type: 'image' | 'video';
    name: string;
  } | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [ttlSec, setTtlSec] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [doubleTapHeartId, setDoubleTapHeartId] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQ, setPollQ] = useState('What should we do tonight?');
  const [pollOpt1, setPollOpt1] = useState('Movie & snacks 🍿');
  const [pollOpt2, setPollOpt2] = useState('Late night drive 🚗');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [whisperMode, setWhisperMode] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [livePartnerTyping, setLivePartnerTyping] = useState(false);

  const presenceRef = useRef<OpenPresenceClient | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    void syncRemoteMessages();
    const handleOnline = () => {
      void syncRemoteMessages();
      void flushOutbox(sendOutboxMessageToSupabase);
    };
    window.addEventListener('online', handleOnline);
    void flushOutbox(sendOutboxMessageToSupabase);

    const ch = supabase
      ? supabase
          .channel(`direct-msg-${CONVERSATION_ID}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${CONVERSATION_ID}`,
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              if (row && row.sender_id !== me.id) {
                void syncRemoteMessages();
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      window.removeEventListener('online', handleOnline);
      if (ch) void ch.unsubscribe();
    };
  }, [me.id, syncRemoteMessages]);

  useEffect(() => {
    if (settings.readReceipts) markAllRead();
  }, [messages.length, settings.readReceipts, markAllRead]);

  useEffect(() => {
    const client = new OpenPresenceClient(
      role,
      pairCode,
      (snap) => {
        updateProfile(partnerRole, {
          online: snap.online,
          last_seen: snap.lastSeen,
        });
        setLivePartnerTyping(snap.typing);
      },
      (incoming) => {
        receiveLiveMessage(incoming);
      }
    );
    presenceRef.current = client;
    client.start(true);
    return () => {
      client.stop();
      presenceRef.current = null;
    };
  }, [role, partnerRole, pairCode, updateProfile, receiveLiveMessage]);

  const lastBroadcastedRef = useRef<string | null>(null);
  useEffect(() => {
    const latest = messages[messages.length - 1];
    if (!latest || latest.sender_id !== me.id || lastBroadcastedRef.current === latest.id) return;
    lastBroadcastedRef.current = latest.id;
    presenceRef.current?.broadcastMessage(latest);
  }, [messages, me.id]);

  useEffect(() => {
    presenceRef.current?.setInvisible(!me.online, true);
  }, [me.online]);

  useEffect(() => {
    presenceRef.current?.setTyping(text.trim().length > 0, true);
  }, [text]);

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
    const trimmed = text.trim().slice(0, 4000);

    if (pendingAttachment) {
      const attach = pendingAttachment;
      const mediaId = `med-${Date.now()}`;
      const clientId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cli-${Date.now()}`;

      // Optimistic instant local display
      sendMessage({
        kind: attach.type,
        body: trimmed || null,
        media: {
          id: mediaId,
          type: attach.type,
          url: attach.url,
          caption: trimmed || attach.name,
          isObjectUrl: true,
        },
        reply_to_id: replyTo?.id ?? null,
        ttlSec,
      });

      setPendingAttachment(null);
      setText('');
      setReplyTo(null);
      setPickerOpen(false);

      // Asynchronous background upload to Supabase Storage & Database
      void (async () => {
        try {
          const res = await uploadPrivateMedia({
            conversationId: CONVERSATION_ID,
            ownerId: me.id,
            file: attach.file,
          });

          const permanentUrl = 'signedUrl' in res ? res.signedUrl : attach.url;

          await enqueueOutbox({
            client_id: clientId,
            conversation_id: CONVERSATION_ID,
            sender_id: me.id,
            kind: attach.type,
            body: trimmed || null,
            reply_to_id: replyTo?.id ?? null,
            expires_at: ttlSec ? new Date(Date.now() + ttlSec * 1000).toISOString() : null,
            payload: {
              media: {
                id: mediaId,
                type: attach.type,
                url: permanentUrl,
                caption: trimmed || attach.name,
              },
              is_snap: true,
            },
            status: 'pending',
            attempts: 0,
            created_at: new Date().toISOString(),
          });
          await flushOutbox(sendOutboxMessageToSupabase);
        } catch (err) {
          console.warn('Media upload to Supabase error:', err);
        }
      })();

      return;
    }

    if (!trimmed) return;

    if (editingMsg) {
      editMessage(editingMsg.id, trimmed);
      setEditingMsg(null);
      setText('');
      return;
    }

    const clientId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cli-${Date.now()}`;
    const kind = whisperMode ? 'whisper' : 'text';
    sendMessage({
      kind,
      body: trimmed,
      reply_to_id: replyTo?.id ?? null,
      ttlSec,
    });
    void enqueueOutbox({
      client_id: clientId,
      conversation_id: CONVERSATION_ID,
      sender_id: me.id,
      kind,
      body: trimmed,
      reply_to_id: replyTo?.id ?? null,
      expires_at: ttlSec ? new Date(Date.now() + ttlSec * 1000).toISOString() : null,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString(),
    }).then(() => flushOutbox(sendOutboxMessageToSupabase));
    setWhisperMode(false);
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
    setPendingAttachment({ file, url, type: isVideo ? 'video' : 'image', name: file.name });
    e.target.value = '';
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 180);
  }

  const bubbleGradient =
    settings.chatTheme === 'ocean-blue'
      ? 'from-sky-500 to-indigo-600'
      : settings.chatTheme === 'amoled-black'
      ? 'from-zinc-800 to-zinc-900 border border-white/15'
      : settings.chatTheme === 'lavender-dream'
      ? 'from-purple-400 to-fuchsia-500'
      : settings.chatTheme === 'sunset' || settings.chatTheme === 'sunset-blush'
      ? 'from-rose-500 to-amber-500'
      : settings.chatTheme === 'midnight-purple' || settings.chatTheme === 'electric-violet'
      ? 'from-violet-600 to-indigo-700'
      : 'from-[#ff4d8d] to-[#8b5cf6]';

  return (
    <div className="flex flex-col h-full relative select-none bg-gradient-to-b from-[#0d0718] via-[#090412] to-[#05020a]">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-20 px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-2 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to home"
            className="h-9 w-9 rounded-full glass flex items-center justify-center text-white/80 hover:text-white shrink-0 -ml-1 active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <AvatarBubble profile={partner} size="md" showOnline />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base truncate leading-tight">{partner.display_name}</h1>
              {/* Snapchat Streak Flame */}
              <button
                type="button"
                onClick={() => {
                  setStreakToast(true);
                  setTimeout(() => setStreakToast(false), 3200);
                }}
                title={`${streakCount} day love streak! Tap for info`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-400/40 text-amber-300 text-[11px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform"
              >
                <Flame className="h-3.5 w-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                <span>{streakCount}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => updateProfile(role, { online: !me.online })}
              className="text-[11px] truncate block text-left w-full"
              title="Tap to toggle your Online/Offline status"
            >
              <span
                className={
                  partnerTyping || livePartnerTyping
                    ? 'text-rose-soft font-medium'
                    : partner.online
                    ? 'text-emerald-300 font-medium'
                    : 'text-white/55'
                }
              >
                {partnerTyping || livePartnerTyping
                  ? 'typing…'
                  : formatWhatsAppLastSeen(partner.online, partner.last_seen)}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = ttlSec === null ? 86400 : ttlSec === 86400 ? 604800 : null;
              setTtlSec(next);
              sendMessage({
                kind: 'system',
                body: next
                  ? `Disappearing messages set to ${next === 86400 ? '24h' : '7d'}`
                  : 'Disappearing messages turned off',
              });
            }}
            aria-label="Toggle disappearing messages"
            title="Disappearing messages"
            className={`h-9 px-2 rounded-xl glass flex items-center justify-center gap-1 text-[11px] ${
              ttlSec ? 'text-amber-300 border border-amber-400/35' : 'text-white/75 hover:text-white'
            }`}
          >
            <Timer className="h-3.5 w-3.5" />
            {ttlSec ? <span>{ttlSec === 86400 ? '24h' : '7d'}</span> : null}
          </button>
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
          const showSender = !prev || prev.sender_id !== msg.sender_id || showDay;
          const replyTarget = msg.reply_to_id ? messages.find((m) => m.id === msg.reply_to_id) : null;
          const sticker = msg.sticker_id ? STICKER_CATALOG.find((s) => s.id === msg.sticker_id) : null;
          const gifSrc =
            msg.gif_url ??
            (msg.gif_id ? ANIMATED_GIF_CATALOG.find((g) => g.id === msg.gif_id)?.url : null);
          const remainingSec = msg.expires_at
            ? Math.max(0, Math.ceil((new Date(msg.expires_at).getTime() - nowTick) / 1000))
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
                {showSender && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 px-1 ${isMe ? 'text-rose-soft' : 'text-violet-300'}`}>
                    {isMe ? 'You' : partner.display_name}
                  </span>
                )}
                <div
                  onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                  onDoubleClick={() => {
                    if (msg.deleted_at) return;
                    toggleReaction(msg.id, '❤️');
                    setDoubleTapHeartId(msg.id);
                    setTimeout(() => setDoubleTapHeartId(null), 700);
                  }}
                  className={`relative max-w-[84%] sm:max-w-[72%] cursor-pointer group transition-all ${
                    msg.deleted_at
                      ? 'glass rounded-2xl px-3.5 py-2 italic text-white/45 text-xs'
                      : msg.saved_in_chat
                      ? 'border-l-4 border-rose-500 bg-white/10 rounded-2xl px-3.5 py-2.5 shadow-lg shadow-black/20 text-white'
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
                        !msg.saved_in_chat ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              markSnapViewed(msg.id);
                              setViewingSnap(msg);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              msg.snap_viewed || msg.read_at
                                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                : msg.kind === 'video'
                                ? 'bg-purple-950/45 border-purple-500/40 hover:bg-purple-900/50 shadow-md shadow-purple-500/15'
                                : 'bg-red-950/45 border-red-500/40 hover:bg-red-900/50 shadow-md shadow-red-500/15'
                            }`}
                          >
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                msg.snap_viewed || msg.read_at
                                  ? msg.kind === 'video'
                                    ? 'border-2 border-purple-400 text-purple-400'
                                    : 'border-2 border-red-400 text-red-400'
                                  : msg.kind === 'video'
                                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                  : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                              }`}
                            >
                              {msg.snap_viewed || msg.read_at ? (
                                msg.kind === 'video' ? <Play className="h-4 w-4" /> : <Square className="h-4 w-4" />
                              ) : (
                                msg.kind === 'video' ? <Play className="h-4 w-4 fill-white" /> : <Square className="h-4 w-4 fill-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-1">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
                                <span>
                                  {msg.snap_viewed || msg.read_at
                                    ? 'Opened'
                                    : msg.kind === 'video'
                                    ? 'New Video Snap'
                                    : 'New Snap'}
                                </span>
                                {!(msg.snap_viewed || msg.read_at) && (
                                  <span className={`h-2 w-2 rounded-full animate-ping ${msg.kind === 'video' ? 'bg-purple-400' : 'bg-red-400'}`} />
                                )}
                              </div>
                              <div className="text-[10px] text-white/60">
                                {msg.snap_viewed || msg.read_at ? 'Tap to replay' : 'Tap to view'} • {formatTime(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              openMediaViewer(msg.id);
                            }}
                            className="mb-1.5 overflow-hidden rounded-2xl border border-white/15"
                          >
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-black/50 text-[10px] text-white/90 font-medium">
                              <BookmarkCheck className="h-3.5 w-3.5 text-rose-soft" /> Saved in Chat
                            </div>
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
                        )
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {renderSafeTextWithLinks(msg.body)}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-white/65">
                        {remainingSec !== null && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-mono text-[9px]">
                            ⏳ {remainingSec}s
                          </span>
                        )}
                        {msg.saved_in_chat && (
                          <span className="text-[9px] text-rose-soft font-semibold flex items-center gap-0.5">
                            <BookmarkCheck className="h-3 w-3" /> Saved
                          </span>
                        )}
                        {msg.edited_at && <span>edited</span>}
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && (
                          <span className="flex items-center gap-0.5 font-semibold text-[10px] text-sky-300">
                            {msg.read_at ? (
                              <>
                                <span className="inline-block text-[11px] leading-none">▷</span> Opened
                              </>
                            ) : (
                              <>
                                <span className="inline-block text-[11px] leading-none">▶</span> Delivered
                              </>
                            )}
                          </span>
                        )}
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
                      <button
                        onClick={() => {
                          toggleSaveInChat(msg.id);
                          setActiveMenuId(null);
                        }}
                        aria-label="Save in Chat"
                        title={msg.saved_in_chat ? 'Remove from Chat' : 'Save in Chat'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          msg.saved_in_chat
                            ? 'bg-rose-500/25 text-rose-soft'
                            : 'hover:bg-white/10 text-white/75 hover:text-white'
                        }`}
                      >
                        <BookmarkCheck className="h-3.5 w-3.5" />
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
            className="absolute right-5 bottom-20 z-20 h-9 w-9 rounded-full glass-strong border border-rose-glow/40 shadow-glow-pink flex items-center justify-center text-white"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer Area */}
      <div className="px-3 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] space-y-2">
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

        <SnapPeekingAvatar
          name={partner.display_name}
          emoji={partner.avatar_emoji}
          online={partner.online}
          typing={partnerTyping || livePartnerTyping}
          onTap={() => setStormKey((k) => k + 1)}
        />

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

        <AnimatePresence>
          {actionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="glass-strong rounded-3xl p-3 grid grid-cols-4 gap-2 border border-white/15 shadow-glass"
            >
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  navigate('/camera');
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <Camera className="h-4 w-4 text-rose-glow" />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <ImagePlus className="h-4 w-4 text-violet-300" />
                <span>Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWhisperMode((w) => !w);
                  setActionsOpen(false);
                }}
                className={`flex flex-col items-center gap-1 py-2 rounded-2xl text-[11px] ${
                  whisperMode ? 'bg-violet-glow/30 border border-violet-glow/45' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <EyeOff className="h-4 w-4 text-violet-300" />
                <span>Whisper</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPollOpen((v) => !v);
                  setPickerOpen(false);
                  setActionsOpen(false);
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <BarChart2 className="h-4 w-4 text-rose-soft" />
                <span>Poll</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTtlSec((cur) =>
                    cur === null ? 86400 : cur === 86400 ? 604800 : cur === 604800 ? 2592000 : null
                  );
                }}
                title="Disappearing messages (Off / 24h / 7d / 30d). Note: cannot prevent screenshots."
                className={`flex flex-col items-center gap-1 py-2 rounded-2xl text-[11px] ${
                  ttlSec ? 'bg-amber-500/25 border border-amber-400/40 text-amber-200' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <Timer className="h-4 w-4 text-amber-300" />
                <span>
                  {ttlSec === 86400 ? '24h' : ttlSec === 604800 ? '7d' : ttlSec === 2592000 ? '30d' : 'Timer Off'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sendHeartbeat();
                  setStormKey((k) => k + 1);
                  setActionsOpen(false);
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <HeartPulse className="h-4 w-4 text-rose-glow" />
                <span>Heartbeat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sendMessage({
                    kind: 'song',
                    song: { title: 'Until I Found You', artist: 'Stephen Sanchez' },
                    ttlSec,
                  });
                  setActionsOpen(false);
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <Music className="h-4 w-4 text-emerald-300" />
                <span>Song</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  sendMessage({ kind: 'love_note', body: 'Thinking of you right now 💖' });
                  setStormKey((k) => k + 1);
                  setActionsOpen(false);
                }}
                className="flex flex-col items-center gap-1 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px]"
              >
                <Sparkles className="h-4 w-4 text-sky-300" />
                <span>Love Note</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
          <form onSubmit={handleSend} className="glass-strong rounded-[28px] p-1.5 flex items-center gap-1.5 border border-white/15">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileAttach}
              className="hidden"
            />

            {/* Snapchat Shutter / Camera Shortcut Button */}
            <button
              type="button"
              onClick={() => navigate('/camera')}
              title="Snapchat Camera"
              aria-label="Open Camera"
              className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-500 p-0.5 shrink-0 shadow-glow-pink hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
            >
              <div className="h-full w-full rounded-full bg-ink-950 flex items-center justify-center">
                <Camera className="h-4 w-4 text-amber-300" />
              </div>
            </button>

            {/* Quick Gallery Snap */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Send Photo/Video Snap"
              aria-label="Gallery Snap"
              className="h-9 w-9 rounded-full glass hover:bg-white/15 flex items-center justify-center shrink-0 text-white/75 hover:text-white transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            {/* Snapchat Style Input */}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={whisperMode ? 'Send a secret whisper…' : 'Send a chat…'}
              className="flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-white/40 min-w-0"
            />

            {(whisperMode || ttlSec) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-glow/25 text-violet-200 shrink-0">
                {whisperMode
                  ? '🤫'
                  : ttlSec === 86400
                  ? '⏳24h'
                  : ttlSec === 604800
                  ? '⏳7d'
                  : ttlSec === 2592000
                  ? '⏳30d'
                  : `⏳${ttlSec}s`}
              </span>
            )}

            {/* Sticker / Bitmoji picker */}
            <button
              type="button"
              onClick={() => {
                setPickerOpen((v) => !v);
                setActionsOpen(false);
              }}
              aria-label="Stickers, emojis and GIFs"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                pickerOpen ? 'bg-rose-glow/25 text-rose-glow' : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <Smile className="h-4 w-4" />
            </button>

            {/* Romantic Action Drawer Toggle */}
            <button
              type="button"
              onClick={() => {
                setActionsOpen((v) => !v);
                setPickerOpen(false);
              }}
              aria-label="More romantic actions"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                actionsOpen
                  ? 'bg-rose-glow/25 text-rose-glow rotate-45'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Snapchat Blue Send Arrow or Voice Snap Mic */}
            {text.trim() || pendingAttachment ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="submit"
                aria-label="Send message"
                className="h-9 w-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/30"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            ) : (
              <button
                type="button"
                onClick={() => setRecordingVoice(true)}
                aria-label="Record voice note"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-rose-glow/25 text-white flex items-center justify-center shrink-0"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Snapchat Fullscreen Snap Viewer */}
      <SnapViewModal
        snap={viewingSnap}
        partnerName={partner.display_name}
        partnerEmoji={partner.avatar_emoji}
        onClose={() => setViewingSnap(null)}
        onSaveToMemories={(snap) => {
          if (snap.media) {
            addMemory({
              title: snap.media.caption || 'Saved Snap',
              date: new Date().toISOString().slice(0, 10),
              note: 'Saved from private snap',
              image_url: snap.media.url,
              favorite: true,
            });
            toggleSaveInChat(snap.id);
          }
        }}
        onDoubleTapHeart={(snapId) => {
          toggleReaction(snapId, '❤️');
          setFloatingHeartKey((k) => k + 1);
        }}
      />

      {/* Snapchat Streak Toast */}
      <AnimatePresence>
        {streakToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="fixed top-16 inset-x-4 mx-auto max-w-xs z-50 p-3.5 rounded-2xl glass-strong border border-amber-400/40 shadow-glow-amber text-center pointer-events-none"
          >
            <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-sm mb-1">
              <Flame className="h-4 w-4 fill-amber-400 animate-pulse" />
              <span>{streakCount} Day Snap Streak!</span>
            </div>
            <p className="text-[11px] text-white/80">
              You & {partner.display_name} have kept your private flame alive! Keep snapping daily.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <LoveStormOverlay burstKey={stormKey} />
    </div>
  );
}
