import { create } from 'zustand';
import {
  CONVERSATION_ID,
  DEMO_CALLS,
  DEMO_COUPLE_WORLD,
  DEMO_MESSAGES,
  DEMO_NOTIFICATIONS,
  DEMO_PROFILES,
} from '@/data/demoData';
import { playMicroSound } from '@/services/haptics';
import {
  playSoftChime,
  triggerBrowserNotification,
  triggerDeviceNotification,
  triggerHeartbeatHaptic,
} from '@/services/notifications';
import { fetchConversationMessages } from '@/services/chatSync';
import type {
  AppNotification,
  AppSettings,
  Call,
  CallKind,
  CoupleWorldState,
  LoveLetter,
  MediaAttachment,
  MemoryItem,
  Message,
  MessageKind,
  MessagePoll,
  NotificationKind,
  NotificationPrefs,
  Profile,
  UserRole,
} from '@/types/models';

const STORAGE_KEY = 'onlyus.v4';

export interface ActiveCallSession {
  id: string;
  kind: CallKind;
  direction: 'outgoing' | 'incoming';
  status: 'ringing' | 'active' | 'missed' | 'ended';
  minimized: boolean;
  startedAt: number | null;
  simulated: boolean;
}

export interface InAppToast {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
}

interface PersistedSlice {
  currentUserRole: UserRole | null;
  onboarded: boolean;
  pairCode: string;
  profiles: Record<UserRole, Profile>;
  messages: Message[];
  calls: Call[];
  notifications: AppNotification[];
  notifPrefs: NotificationPrefs;
  favoriteStickers: string[];
  recentStickers: string[];
  world: CoupleWorldState;
  settings: AppSettings;
}

const DEFAULT_PREFS: NotificationPrefs = {
  sound: true,
  browserPush: false,
  quietHoursEnabled: false,
  quietStart: '23:00',
  quietEnd: '07:00',
  showPreview: true,
};

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'dark',
  chatTheme: 'midnight-rose',
  wallpaper: 'constellation',
  soundEffects: true,
  readReceipts: true,
  typingIndicators: true,
  reducedMotionOverride: false,
};

function loadInitial(): PersistedSlice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSlice>;
      return {
        currentUserRole: parsed.currentUserRole ?? null,
        onboarded: parsed.onboarded ?? false,
        pairCode: parsed.pairCode ?? 'ONLYUS-849210',
        profiles: parsed.profiles ?? DEMO_PROFILES,
        messages: parsed.messages ?? DEMO_MESSAGES,
        calls: parsed.calls ?? DEMO_CALLS,
        notifications: parsed.notifications ?? DEMO_NOTIFICATIONS,
        notifPrefs: { ...DEFAULT_PREFS, ...parsed.notifPrefs },
        favoriteStickers: parsed.favoriteStickers ?? ['stk-love-1', 'stk-kiss-1', 'stk-hrt-1'],
        recentStickers: parsed.recentStickers ?? ['stk-kiss-1', 'stk-love-1'],
        world: parsed.world ?? DEMO_COUPLE_WORLD,
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      };
    }
  } catch {
    // Fallback to defaults
  }
  return {
    currentUserRole: null,
    onboarded: false,
    pairCode: 'ONLYUS-849210',
    profiles: DEMO_PROFILES,
    messages: DEMO_MESSAGES,
    calls: DEMO_CALLS,
    notifications: DEMO_NOTIFICATIONS,
    notifPrefs: DEFAULT_PREFS,
    favoriteStickers: ['stk-love-1', 'stk-kiss-1', 'stk-hrt-1'],
    recentStickers: ['stk-kiss-1', 'stk-love-1'],
    world: DEMO_COUPLE_WORLD,
    settings: DEFAULT_SETTINGS,
  };
}

function persist(slice: PersistedSlice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch {
    // Ignore quota errors on large object URLs
  }
}

interface AppStore extends PersistedSlice {
  partnerTyping: boolean;
  activeCall: ActiveCallSession | null;
  toasts: InAppToast[];
  viewerMessageId: string | null;
  celebrationTrigger: number;

  // Auth & Profiles
  signInAsRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  signOutDemo: () => void;
  setPairCode: (code: string) => void;
  updateProfile: (role: UserRole, patch: Partial<Profile>) => void;
  receiveLiveMessage: (msg: Message) => void;
  syncRemoteMessages: () => Promise<void>;

  // Chat
  sendMessage: (payload: {
    kind: MessageKind;
    body?: string | null;
    media?: MediaAttachment | null;
    sticker_id?: string | null;
    gif_id?: string | null;
    gif_url?: string | null;
    gif_title?: string | null;
    poll?: MessagePoll | null;
    song?: { title: string; artist: string } | null;
    revealed?: boolean;
    reply_to_id?: string | null;
    ttlSec?: number | null;
  }) => void;
  votePoll: (messageId: string, optionId: string) => void;
  revealWhisper: (messageId: string) => void;
  setMyVibe: (vibe: string) => void;
  purgeExpiredMessages: () => void;
  sendHeartbeat: () => void;
  editMessage: (id: string, body: string) => void;
  deleteMessage: (id: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePin: (messageId: string) => void;
  toggleSaveInChat: (messageId: string) => void;
  markSnapViewed: (messageId: string) => void;
  markAllRead: () => void;
  simulatePartnerReply: (customText?: string) => void;
  simulatePartnerSticker: () => void;

  // Media Viewer
  openMediaViewer: (messageId: string) => void;
  closeMediaViewer: () => void;

  // Calls
  startCall: (kind: CallKind) => void;
  simulateIncomingCall: (kind: CallKind) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleMinimizeCall: (minimized?: boolean) => void;

  // Notifications
  pushNotification: (kind: NotificationKind, title: string, body: string, action_route?: string) => void;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
  clearAllNotifications: () => void;
  updateNotifPrefs: (patch: Partial<NotificationPrefs>) => void;
  dismissToast: (id: string) => void;

  // Stickers
  toggleFavoriteSticker: (id: string) => void;
  recordRecentSticker: (id: string) => void;

  // Couple World
  updateWorld: (patch: Partial<CoupleWorldState>) => void;
  addMemory: (item: Omit<MemoryItem, 'id' | 'created_by'>) => void;
  toggleFavoriteMemory: (id: string) => void;
  addLoveLetter: (title: string, body: string, mood: string) => void;
  celebrateStreak: () => void;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetDemoData: () => void;
}

const PARTNER_REPLIES = [
  'Miss you already 🥺💜',
  'Wait that actually made me smile so much ✨',
  'Sending you the biggest hug right now 🫂❤️',
  'Can’t wait to see you tonight 🌙',
  'You’re literally my favorite person ever 💖',
  'Hold on, I’m still thinking about what you said earlier 🙈💘',
  'Stealing your hoodie the second I see you 🥰',
  'Just heard our song and immediately thought of you 🎶✨',
  'You + me + late night snacks = perfection 🍿💜',
  'Counting down the hours until we call 📞💫',
  'Okay but why are you so cute though 🥹❤️',
  'Saving this moment in my heart forever 💌',
  'Do you know how much I adore you? 🌹',
  'On my way to give you a thousand forehead kisses 😘',
  'Even on busy days, talking to you resets everything ☀️',
  'Forever isn’t even long enough with you ♾️💖',
];

export const useAppStore = create<AppStore>((set, get) => {
  const initial = loadInitial();
  document.documentElement.setAttribute('data-theme', initial.settings.themeMode);

  const sync = (next: Partial<PersistedSlice>) => {
    const s = get();
    const merged: PersistedSlice = {
      currentUserRole: next.currentUserRole !== undefined ? next.currentUserRole : s.currentUserRole,
      onboarded: next.onboarded !== undefined ? next.onboarded : s.onboarded,
      pairCode: next.pairCode ?? s.pairCode,
      profiles: next.profiles ?? s.profiles,
      messages: next.messages ?? s.messages,
      calls: next.calls ?? s.calls,
      notifications: next.notifications ?? s.notifications,
      notifPrefs: next.notifPrefs ?? s.notifPrefs,
      favoriteStickers: next.favoriteStickers ?? s.favoriteStickers,
      recentStickers: next.recentStickers ?? s.recentStickers,
      world: next.world ?? s.world,
      settings: next.settings ?? s.settings,
    };
    persist(merged);
  };

  return {
    ...initial,
    partnerTyping: false,
    activeCall: null,
    toasts: [],
    viewerMessageId: null,
    celebrationTrigger: 0,

    signInAsRole(role) {
      set({ currentUserRole: role });
      sync({ currentUserRole: role });
    },

    completeOnboarding() {
      set({ onboarded: true });
      sync({ onboarded: true });
    },

    signOutDemo() {
      set({ currentUserRole: null, activeCall: null });
      sync({ currentUserRole: null });
    },

    setPairCode(code) {
      const normalized = code.trim().toUpperCase() || 'ONLYUS-849210';
      set({ pairCode: normalized });
      sync({ pairCode: normalized });
    },

    receiveLiveMessage(msg) {
      const exists = get().messages.some(
        (m) => m.id === msg.id || (m.client_id && msg.client_id && m.client_id === msg.client_id)
      );
      if (exists) return;
      const messages = [...get().messages, msg].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      set({ messages });
      sync({ messages });
      const role = get().currentUserRole ?? 'me';
      const partner = get().profiles[role === 'me' ? 'partner' : 'me'];
      const preview =
        msg.kind === 'gif'
          ? 'Sent a GIF 🎞️'
          : msg.kind === 'sticker'
          ? 'Sent a sticker ✨'
          : msg.kind === 'whisper'
          ? 'Sent a Secret Whisper 🤫'
          : msg.kind === 'image'
          ? 'Sent a Snap 📸'
          : msg.kind === 'video'
          ? 'Sent a Video Snap 🎥'
          : msg.kind === 'voice'
          ? 'Sent a Voice Note 🎙️'
          : msg.body || 'Sent a sweet note';

      // Trigger native phone notification on Android
      triggerDeviceNotification(`${partner.display_name} 💖`, preview);
      triggerHeartbeatHaptic();
      playSoftChime(msg.kind === 'whisper' ? 'whisper' : 'receive');

      get().pushNotification('message', partner.display_name, preview, '/chats');
    },

    async syncRemoteMessages() {
      try {
        const remote = await fetchConversationMessages(CONVERSATION_ID, 80);
        if (remote && remote.length > 0) {
          const local = get().messages;
          const mergedMap = new Map<string, Message>();
          local.forEach((m) => mergedMap.set(m.client_id || m.id, m));
          remote.forEach((m) => {
            const key = m.client_id || m.id;
            const existing = mergedMap.get(key);
            mergedMap.set(key, { ...existing, ...m });
          });
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          set({ messages: merged });
          sync({ messages: merged });
        }
      } catch (err) {
        console.warn('Failed to sync remote messages:', err);
      }
    },

    updateProfile(role, patch) {
      const profiles = {
        ...get().profiles,
        [role]: { ...get().profiles[role], ...patch },
      };
      set({ profiles });
      sync({ profiles });
    },

    sendMessage({
      kind,
      body = null,
      media = null,
      sticker_id = null,
      gif_id = null,
      gif_url = null,
      gif_title = null,
      poll = null,
      song = null,
      revealed = false,
      reply_to_id = null,
      ttlSec = null,
    }) {
      const role = get().currentUserRole ?? 'me';
      const sender = get().profiles[role];
      const nowMs = Date.now();
      const now = new Date(nowMs).toISOString();
      const msg: Message = {
        id: `msg-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
        conversation_id: CONVERSATION_ID,
        sender_id: sender.id,
        client_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cli-${nowMs}`,
        kind,
        body,
        media,
        sticker_id,
        gif_id,
        gif_url,
        gif_title,
        poll,
        song,
        revealed,
        reply_to_id,
        reactions: [],
        edited_at: null,
        deleted_at: null,
        pinned_at: null,
        delivered_at: now,
        read_at: null,
        expires_at: ttlSec ? new Date(nowMs + ttlSec * 1000).toISOString() : null,
        created_at: now,
      };
      const messages = [...get().messages, msg];
      set({ messages });
      sync({ messages });
      playMicroSound('send', get().settings.soundEffects);

      if (sticker_id) get().recordRecentSticker(sticker_id);
    },

    votePoll(messageId, optionId) {
      const role = get().currentUserRole ?? 'me';
      const userId = get().profiles[role].id;
      const messages = get().messages.map((m) => {
        if (m.id !== messageId || !m.poll) return m;
        const options = m.poll.options.map((opt) => {
          const filtered = opt.votes.filter((v) => v !== userId);
          return opt.id === optionId ? { ...opt, votes: [...filtered, userId] } : { ...opt, votes: filtered };
        });
        return { ...m, poll: { ...m.poll, options } };
      });
      set({ messages });
      sync({ messages });
      playMicroSound('tap', get().settings.soundEffects);
    },

    revealWhisper(messageId) {
      const messages = get().messages.map((m) =>
        m.id === messageId ? { ...m, revealed: true } : m
      );
      set({ messages });
      sync({ messages });
      playMicroSound('reveal', get().settings.soundEffects);
    },

    setMyVibe(vibe) {
      const role = get().currentUserRole ?? 'me';
      get().updateProfile(role, { status_text: vibe });
      playMicroSound('tap', get().settings.soundEffects);
    },

    purgeExpiredMessages() {
      const nowMs = Date.now();
      const current = get().messages;
      const filtered = current.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > nowMs);
      if (filtered.length !== current.length) {
        set({ messages: filtered });
        sync({ messages: filtered });
      }
    },

    sendHeartbeat() {
      playMicroSound('heartbeat', get().settings.soundEffects);
      get().sendMessage({
        kind: 'love_note',
        body: '💓 Sent you a live heartbeat pulse — thinking of you right now',
      });
    },

    editMessage(id, body) {
      const messages = get().messages.map((m) =>
        m.id === id ? { ...m, body, edited_at: new Date().toISOString() } : m
      );
      set({ messages });
      sync({ messages });
    },

    deleteMessage(id) {
      const messages = get().messages.map((m) =>
        m.id === id ? { ...m, deleted_at: new Date().toISOString(), body: null, media: null } : m
      );
      set({ messages });
      sync({ messages });
    },

    toggleReaction(messageId, emoji) {
      const role = get().currentUserRole ?? 'me';
      const userId = get().profiles[role].id;
      const messages = get().messages.map((m) => {
        if (m.id !== messageId) return m;
        const exists = m.reactions.some((r) => r.emoji === emoji && r.user_id === userId);
        const reactions = exists
          ? m.reactions.filter((r) => !(r.emoji === emoji && r.user_id === userId))
          : [...m.reactions, { emoji, user_id: userId, created_at: new Date().toISOString() }];
        return { ...m, reactions };
      });
      set({ messages });
      sync({ messages });
    },

    togglePin(messageId) {
      const messages = get().messages.map((m) =>
        m.id === messageId ? { ...m, pinned_at: m.pinned_at ? null : new Date().toISOString() } : m
      );
      set({ messages });
      sync({ messages });
    },

    toggleSaveInChat(messageId) {
      const messages = get().messages.map((m) =>
        m.id === messageId ? { ...m, saved_in_chat: !m.saved_in_chat } : m
      );
      set({ messages });
      sync({ messages });
    },

    markSnapViewed(messageId) {
      const messages = get().messages.map((m) =>
        m.id === messageId ? { ...m, snap_viewed: true, read_at: m.read_at || new Date().toISOString() } : m
      );
      set({ messages });
      sync({ messages });
    },

    markAllRead() {
      const role = get().currentUserRole ?? 'me';
      const myId = get().profiles[role].id;
      const now = new Date().toISOString();
      let changed = false;
      const messages = get().messages.map((m) => {
        if (m.sender_id !== myId && !m.read_at) {
          changed = true;
          return { ...m, read_at: now };
        }
        return m;
      });
      if (changed) {
        set({ messages });
        sync({ messages });
      }
    },

    simulatePartnerReply(customText) {
      const role = get().currentUserRole ?? 'me';
      const partnerRole: UserRole = role === 'me' ? 'partner' : 'me';
      const partner = get().profiles[partnerRole];
      set({ partnerTyping: true });

      setTimeout(() => {
        const text = customText ?? PARTNER_REPLIES[Math.floor(Math.random() * PARTNER_REPLIES.length)];
        const now = new Date().toISOString();
        const msg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: CONVERSATION_ID,
          sender_id: partner.id,
          client_id: `cli-${Date.now()}`,
          kind: 'text',
          body: text,
          reply_to_id: null,
          reactions: [],
          edited_at: null,
          deleted_at: null,
          pinned_at: null,
          delivered_at: now,
          read_at: null,
          expires_at: null,
          created_at: now,
        };
        const messages = [...get().messages, msg];
        set({ messages, partnerTyping: false });
        sync({ messages });
        get().pushNotification('message', partner.display_name, text, '/chats');
      }, 1400);
    },

    simulatePartnerSticker() {
      const role = get().currentUserRole ?? 'me';
      const partnerRole: UserRole = role === 'me' ? 'partner' : 'me';
      const partner = get().profiles[partnerRole];
      const stickerIds = ['stk-love-1', 'stk-kiss-1', 'stk-hug-1', 'stk-hrt-1', 'stk-cute-1', 'stk-rom-2'];
      const picked = stickerIds[Math.floor(Math.random() * stickerIds.length)];
      set({ partnerTyping: true });

      setTimeout(() => {
        const now = new Date().toISOString();
        const msg: Message = {
          id: `msg-${Date.now()}`,
          conversation_id: CONVERSATION_ID,
          sender_id: partner.id,
          client_id: `cli-${Date.now()}`,
          kind: 'sticker',
          body: null,
          sticker_id: picked,
          reply_to_id: null,
          reactions: [],
          edited_at: null,
          deleted_at: null,
          pinned_at: null,
          delivered_at: now,
          read_at: null,
          expires_at: null,
          created_at: now,
        };
        const messages = [...get().messages, msg];
        set({ messages, partnerTyping: false });
        sync({ messages });
        get().pushNotification('message', partner.display_name, 'Sent you a sticker 💖', '/chats');
      }, 1100);
    },

    openMediaViewer(messageId) {
      set({ viewerMessageId: messageId });
    },
    closeMediaViewer() {
      set({ viewerMessageId: null });
    },

    startCall(kind) {
      const id = `call-${Date.now()}`;
      const role = get().currentUserRole ?? 'me';
      set({
        activeCall: {
          id,
          kind,
          direction: 'outgoing',
          status: 'ringing',
          minimized: false,
          startedAt: null,
          simulated: false,
        },
      });
      if (get().settings.soundEffects) playSoftChime('ring');
      void import('@/services/callSignaling').then(({ broadcastCallSignal }) => {
        broadcastCallSignal(get().pairCode, {
          type: 'call:ring',
          callId: id,
          kind,
          fromRole: role,
        });
      });
    },

    simulateIncomingCall(kind) {
      const id = `call-${Date.now()}`;
      set({
        activeCall: {
          id,
          kind,
          direction: 'incoming',
          status: 'ringing',
          minimized: false,
          startedAt: null,
          simulated: false,
        },
      });
      if (get().settings.soundEffects) playSoftChime('ring');
    },

    acceptCall() {
      const cur = get().activeCall;
      if (!cur) return;
      const role = get().currentUserRole ?? 'me';
      set({ activeCall: { ...cur, status: 'active', startedAt: Date.now() } });
      void import('@/services/callSignaling').then(({ broadcastCallSignal }) => {
        broadcastCallSignal(get().pairCode, {
          type: 'call:accept',
          callId: cur.id,
          fromRole: role,
        });
      });
    },

    declineCall() {
      const cur = get().activeCall;
      if (!cur) return;
      const role = get().currentUserRole ?? 'me';
      void import('@/services/callSignaling').then(({ broadcastCallSignal }) => {
        broadcastCallSignal(get().pairCode, {
          type: 'call:decline',
          callId: cur.id,
          fromRole: role,
        });
      });
      const myId = get().profiles[role].id;
      const partnerId = get().profiles[role === 'me' ? 'partner' : 'me'].id;
      const entry: Call = {
        id: cur.id,
        conversation_id: CONVERSATION_ID,
        caller_id: cur.direction === 'outgoing' ? myId : partnerId,
        callee_id: cur.direction === 'outgoing' ? partnerId : myId,
        kind: cur.kind,
        status: cur.direction === 'incoming' ? 'missed' : 'declined',
        simulated: true,
        answered_at: null,
        ended_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const calls = [entry, ...get().calls];
      set({ activeCall: null, calls });
      sync({ calls });
      if (entry.status === 'missed') {
        get().pushNotification('missed_call', 'Missed Call', `Missed ${cur.kind} call`, '/calls');
      }
    },

    endCall() {
      const cur = get().activeCall;
      if (!cur) return;
      const role = get().currentUserRole ?? 'me';
      void import('@/services/callSignaling').then(({ broadcastCallSignal }) => {
        broadcastCallSignal(get().pairCode, {
          type: 'call:end',
          callId: cur.id,
          fromRole: role,
        });
      });
      const myId = get().profiles[role].id;
      const partnerId = get().profiles[role === 'me' ? 'partner' : 'me'].id;
      const duration = cur.startedAt ? Math.max(1, Math.round((Date.now() - cur.startedAt) / 1000)) : 0;
      const entry: Call = {
        id: cur.id,
        conversation_id: CONVERSATION_ID,
        caller_id: cur.direction === 'outgoing' ? myId : partnerId,
        callee_id: cur.direction === 'outgoing' ? partnerId : myId,
        kind: cur.kind,
        status: cur.status === 'active' ? 'ended' : 'missed',
        duration_sec: duration,
        simulated: true,
        answered_at: cur.startedAt ? new Date(cur.startedAt).toISOString() : null,
        ended_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const calls = [entry, ...get().calls];
      set({ activeCall: null, calls });
      sync({ calls });
    },

    toggleMinimizeCall(minimized) {
      const cur = get().activeCall;
      if (!cur) return;
      set({ activeCall: { ...cur, minimized: minimized ?? !cur.minimized } });
    },

    pushNotification(kind, title, body, action_route) {
      const prefs = get().notifPrefs;
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        kind,
        title,
        body: prefs.showPreview ? body : 'New private activity',
        read: false,
        created_at: new Date().toISOString(),
        action_route,
      };
      const notifications = [notif, ...get().notifications].slice(0, 40);
      const toast: InAppToast = { id: notif.id, title: notif.title, body: notif.body, kind };
      set({ notifications, toasts: [...get().toasts, toast] });
      sync({ notifications });

      const nowHm = new Date().toTimeString().slice(0, 5);
      const inQuiet =
        prefs.quietHoursEnabled &&
        (prefs.quietStart <= prefs.quietEnd
          ? nowHm >= prefs.quietStart && nowHm <= prefs.quietEnd
          : nowHm >= prefs.quietStart || nowHm <= prefs.quietEnd);

      if (!inQuiet && prefs.sound && get().settings.soundEffects) playSoftChime('receive');
      if (!inQuiet && prefs.browserPush) triggerBrowserNotification(title, notif.body);

      setTimeout(() => {
        get().dismissToast(toast.id);
      }, 4200);
    },

    markNotifRead(id) {
      const notifications = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      set({ notifications });
      sync({ notifications });
    },

    markAllNotifsRead() {
      const notifications = get().notifications.map((n) => ({ ...n, read: true }));
      set({ notifications });
      sync({ notifications });
    },

    clearAllNotifications() {
      set({ notifications: [], toasts: [] });
      sync({ notifications: [] });
    },

    updateNotifPrefs(patch) {
      const notifPrefs = { ...get().notifPrefs, ...patch };
      set({ notifPrefs });
      sync({ notifPrefs });
    },

    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    toggleFavoriteSticker(id) {
      const cur = get().favoriteStickers;
      const favoriteStickers = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      set({ favoriteStickers });
      sync({ favoriteStickers });
    },

    recordRecentSticker(id) {
      const recentStickers = [id, ...get().recentStickers.filter((x) => x !== id)].slice(0, 8);
      set({ recentStickers });
      sync({ recentStickers });
    },

    updateWorld(patch) {
      const world = { ...get().world, ...patch };
      set({ world });
      sync({ world });
    },

    addMemory(item) {
      const role = get().currentUserRole ?? 'me';
      const mem: MemoryItem = {
        ...item,
        id: `mem-${Date.now()}`,
        created_by: get().profiles[role].id,
      };
      const world = { ...get().world, memories: [mem, ...get().world.memories] };
      set({ world });
      sync({ world });
    },

    toggleFavoriteMemory(id) {
      const memories = get().world.memories.map((m) => (m.id === id ? { ...m, favorite: !m.favorite } : m));
      const world = { ...get().world, memories };
      set({ world });
      sync({ world });
    },

    addLoveLetter(title, body, mood) {
      const role = get().currentUserRole ?? 'me';
      const letter: LoveLetter = {
        id: `let-${Date.now()}`,
        sender_id: get().profiles[role].id,
        title,
        body,
        mood,
        created_at: new Date().toISOString(),
      };
      const world = { ...get().world, loveLetters: [letter, ...get().world.loveLetters] };
      set({ world });
      sync({ world });
      get().sendMessage({ kind: 'love_note', body: `${title} — ${body}` });
      get().pushNotification('love_note', 'Love Letter Sent 💌', title, '/memories');
    },

    celebrateStreak() {
      const world = {
        ...get().world,
        streakDays: get().world.streakDays + 1,
        lastStreakCelebrated: new Date().toISOString(),
      };
      set({ world, celebrationTrigger: get().celebrationTrigger + 1 });
      sync({ world });
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      document.documentElement.setAttribute('data-theme', settings.themeMode);
      set({ settings });
      sync({ settings });
    },

    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY);
      document.documentElement.setAttribute('data-theme', 'dark');
      set({
        currentUserRole: 'me',
        onboarded: true,
        profiles: DEMO_PROFILES,
        messages: DEMO_MESSAGES,
        calls: DEMO_CALLS,
        notifications: DEMO_NOTIFICATIONS,
        notifPrefs: DEFAULT_PREFS,
        favoriteStickers: ['stk-love-1', 'stk-kiss-1', 'stk-hrt-1'],
        recentStickers: ['stk-kiss-1', 'stk-love-1'],
        world: DEMO_COUPLE_WORLD,
        settings: DEFAULT_SETTINGS,
        activeCall: null,
      });
    },
  };
});
