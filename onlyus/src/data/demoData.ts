import type {
  AppNotification,
  Call,
  CoupleWorldState,
  Message,
  Profile,
  StickerItem,
} from '@/types/models';

export const CONVERSATION_ID = 'c09e5a25-d817-4563-9d92-25928d999b76';

export const DEMO_PROFILES: Record<'me' | 'partner', Profile> = {
  me: {
    id: '4a28983c-da6f-4ffd-a948-decab3ce394f',
    role: 'me',
    display_name: 'Bhaskar',
    nickname: 'Bhu',
    avatar_path: '/avatars/bhaskar.jpg',
    avatar_emoji: '🖤',
    bio: 'Building our little universe, one late-night call at a time.',
    status_text: 'Thinking of Purvika ✨',
    online: true,
    last_seen: new Date().toISOString(),
    accent_color: '#ff4d8d',
    birthday: '2001-08-14',
    aura_ring: 'flame',
  },
  partner: {
    id: 'bdd942c4-19c2-472d-8a4d-dc5b99895e5d',
    role: 'partner',
    display_name: 'Purvika',
    nickname: 'Puri',
    avatar_path: '/avatars/purvika.jpg',
    avatar_emoji: '🌸',
    bio: 'Yours in every lifetime. Coffee, midnight talks & long drives.',
    status_text: 'Online • Listening to our playlist',
    online: true,
    last_seen: new Date().toISOString(),
    accent_color: '#8b5cf6',
    birthday: '2002-04-22',
    aura_ring: 'heartbeat',
  },
};

export const DEMO_MESSAGES: Message[] = [];

export const DEMO_CALLS: Call[] = [];

export const DEMO_NOTIFICATIONS: AppNotification[] = [];

export const STICKER_CATALOG: StickerItem[] = [
  // Love (3)
  { id: 'stk-love-1', category: 'Love', label: 'Forever Yours', emoji: '💖', gradient: 'from-pink-500 to-violet-600', animation: 'pulse' },
  { id: 'stk-love-2', category: 'Love', label: 'Love Letter', emoji: '💌', gradient: 'from-rose-500 to-fuchsia-600', animation: 'float' },
  { id: 'stk-love-3', category: 'Love', label: 'Infinity Us', emoji: '♾️', gradient: 'from-pink-400 to-purple-600', animation: 'spin' },
  // Cute (3)
  { id: 'stk-cute-1', category: 'Cute', label: 'Puppy Eyes', emoji: '🥹', gradient: 'from-amber-400 to-pink-500', animation: 'bounce' },
  { id: 'stk-cute-2', category: 'Cute', label: 'Starry Us', emoji: '🧸', gradient: 'from-violet-500 to-pink-400', animation: 'wiggle' },
  { id: 'stk-cute-3', category: 'Cute', label: 'Butterfly', emoji: '🦋', gradient: 'from-sky-400 to-violet-500', animation: 'float' },
  // Funny (3)
  { id: 'stk-funny-1', category: 'Funny', label: 'Drama Queen', emoji: '🤪', gradient: 'from-fuchsia-500 to-indigo-500', animation: 'wiggle' },
  { id: 'stk-funny-2', category: 'Funny', label: 'Snack Tax', emoji: '🍟', gradient: 'from-orange-400 to-rose-500', animation: 'bounce' },
  { id: 'stk-funny-3', category: 'Funny', label: 'Side Eye', emoji: '👀', gradient: 'from-teal-400 to-indigo-500', animation: 'wiggle' },
  // Romantic (3)
  { id: 'stk-rom-1', category: 'Romantic', label: 'Moonlight', emoji: '🌙', gradient: 'from-indigo-600 to-purple-500', animation: 'float' },
  { id: 'stk-rom-2', category: 'Romantic', label: 'Midnight Rose', emoji: '🌹', gradient: 'from-rose-600 to-purple-700', animation: 'pulse' },
  { id: 'stk-rom-3', category: 'Romantic', label: 'Champagne', emoji: '🥂', gradient: 'from-amber-500 to-rose-600', animation: 'bounce' },
  // Good morning (3)
  { id: 'stk-gm-1', category: 'Good morning', label: 'Morning Sunshine', emoji: '☀️', gradient: 'from-amber-400 to-rose-400', animation: 'spin' },
  { id: 'stk-gm-2', category: 'Good morning', label: 'Coffee Date', emoji: '☕', gradient: 'from-amber-500 to-pink-500', animation: 'float' },
  { id: 'stk-gm-3', category: 'Good morning', label: 'Rise & Shine', emoji: '🌅', gradient: 'from-orange-400 to-pink-500', animation: 'pulse' },
  // Good night (3)
  { id: 'stk-gn-1', category: 'Good night', label: 'Sweet Dreams', emoji: '✨', gradient: 'from-violet-600 to-indigo-800', animation: 'pulse' },
  { id: 'stk-gn-2', category: 'Good night', label: 'Sleepy Cloud', emoji: '💤', gradient: 'from-purple-500 to-pink-600', animation: 'float' },
  { id: 'stk-gn-3', category: 'Good night', label: 'Night Stars', emoji: '🌌', gradient: 'from-indigo-700 to-violet-600', animation: 'float' },
  // Hugs (3)
  { id: 'stk-hug-1', category: 'Hugs', label: 'Big Squeeze', emoji: '🫂', gradient: 'from-pink-500 to-purple-600', animation: 'bounce' },
  { id: 'stk-hug-2', category: 'Hugs', label: 'Cozy Blanket', emoji: '🧣', gradient: 'from-rose-400 to-violet-500', animation: 'wiggle' },
  { id: 'stk-hug-3', category: 'Hugs', label: 'Warm Cocoa', emoji: '🍫', gradient: 'from-amber-600 to-rose-500', animation: 'float' },
  // Kisses (3)
  { id: 'stk-kiss-1', category: 'Kisses', label: 'Blowing Kiss', emoji: '😘', gradient: 'from-pink-500 to-rose-600', animation: 'pulse' },
  { id: 'stk-kiss-2', category: 'Kisses', label: 'Lipstick Mark', emoji: '💋', gradient: 'from-red-500 to-pink-500', animation: 'bounce' },
  { id: 'stk-kiss-3', category: 'Kisses', label: 'Smooch Cloud', emoji: '😚', gradient: 'from-rose-400 to-fuchsia-600', animation: 'wiggle' },
  // Hearts (3)
  { id: 'stk-hrt-1', category: 'Hearts', label: 'Neon Heart', emoji: '💗', gradient: 'from-pink-400 to-fuchsia-600', animation: 'pulse' },
  { id: 'stk-hrt-2', category: 'Hearts', label: 'Sparkle Heart', emoji: '💘', gradient: 'from-rose-500 to-violet-500', animation: 'float' },
  { id: 'stk-hrt-3', category: 'Hearts', label: 'Growing Heart', emoji: '💓', gradient: 'from-pink-500 to-red-500', animation: 'pulse' },
];

export const GIF_CATALOG = [
  { id: 'gif-1', title: 'Sending Virtual Hugs', subtitle: '100% Warmth', emoji: '🫂✨', c1: '#ff4d8d', c2: '#8b5cf6' },
  { id: 'gif-2', title: 'Heartbeats Synced', subtitle: 'OnlyUs Mode', emoji: '💓🌙', c1: '#ec4899', c2: '#6366f1' },
  { id: 'gif-3', title: 'Miss You So Much', subtitle: 'Come over soon', emoji: '🥺💘', c1: '#a855f7', c2: '#ff4d8d' },
  { id: 'gif-4', title: 'Date Night Vibes', subtitle: 'Popcorn ready', emoji: '🍿🎬', c1: '#7c3aed', c2: '#f43f5e' },
  { id: 'gif-5', title: 'Stargazing Together', subtitle: 'Under our sky', emoji: '🌌💫', c1: '#312e81', c2: '#a855f7' },
  { id: 'gif-6', title: 'Morning Coffee For Two', subtitle: 'Extra sweet', emoji: '☕💜', c1: '#92400e', c2: '#ec4899' },
  { id: 'gif-7', title: 'Dancing In The Rain', subtitle: 'No umbrella needed', emoji: '🌧️💃', c1: '#0ea5e9', c2: '#8b5cf6' },
  { id: 'gif-8', title: 'Pillow Fight!', subtitle: 'You started it', emoji: '🛏️😂', c1: '#f43f5e', c2: '#7c3aed' },
];

export const DEMO_COUPLE_WORLD: CoupleWorldState = {
  streakDays: 0,
  lastStreakCelebrated: null,
  anniversaryDate: new Date().toISOString().slice(0, 10),
  dailyQuestion: 'What is one tiny moment from today that made you smile?',
  myAnswer: '',
  partnerAnswer: '',
  dailyRomanticMessage: 'Your private space for two.',
  memories: [],
  loveLetters: [],
  timeline: [],
};
