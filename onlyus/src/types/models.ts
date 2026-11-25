export type UserRole = 'me' | 'partner';

export type MessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'voice'
  | 'sticker'
  | 'gif'
  | 'love_note'
  | 'poll'
  | 'system';

export interface PollOption {
  id: string;
  label: string;
  votes: string[];
}

export interface MessagePoll {
  question: string;
  options: PollOption[];
}

export type CallKind = 'voice' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined' | 'failed';

export type ChatThemeId = 'midnight-rose' | 'electric-violet' | 'aurora-velvet' | 'sunset-blush';
export type WallpaperId = 'constellation' | 'nebula' | 'hearts' | 'minimal';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  nickname: string;
  avatar_path: string | null;
  avatar_emoji: string;
  bio: string;
  status_text: string;
  online: boolean;
  last_seen: string;
  accent_color: string;
  birthday: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'voice';
  url: string;
  caption?: string;
  durationSec?: number;
  filter?: string;
  width?: number;
  height?: number;
  isObjectUrl?: boolean;
}

export interface Reaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_id: string;
  kind: MessageKind;
  body: string | null;
  media?: MediaAttachment | null;
  sticker_id?: string | null;
  gif_id?: string | null;
  gif_url?: string | null;
  gif_title?: string | null;
  poll?: MessagePoll | null;
  reply_to_id: string | null;
  reactions: Reaction[];
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Call {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  kind: CallKind;
  status: CallStatus;
  duration_sec?: number;
  simulated?: boolean;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export type NotificationKind = 'message' | 'missed_call' | 'photo' | 'voice' | 'love_note' | 'streak';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  action_route?: string;
}

export interface NotificationPrefs {
  sound: boolean;
  browserPush: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  showPreview: boolean;
}

export type StickerCategory =
  | 'Love'
  | 'Cute'
  | 'Funny'
  | 'Romantic'
  | 'Good morning'
  | 'Good night'
  | 'Hugs'
  | 'Kisses'
  | 'Hearts';

export interface StickerItem {
  id: string;
  category: StickerCategory;
  label: string;
  emoji: string;
  gradient: string;
  animation: 'bounce' | 'pulse' | 'float' | 'spin' | 'wiggle';
}

export interface MemoryItem {
  id: string;
  title: string;
  date: string;
  note: string;
  image_url: string;
  location?: string;
  favorite: boolean;
  created_by: string;
}

export interface LoveLetter {
  id: string;
  sender_id: string;
  title: string;
  body: string;
  mood: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: string;
}

export interface CoupleWorldState {
  streakDays: number;
  lastStreakCelebrated: string | null;
  anniversaryDate: string;
  dailyQuestion: string;
  myAnswer: string;
  partnerAnswer: string;
  dailyRomanticMessage: string;
  memories: MemoryItem[];
  loveLetters: LoveLetter[];
  timeline: TimelineEvent[];
}

export interface AppSettings {
  themeMode: 'dark' | 'light';
  chatTheme: ChatThemeId;
  wallpaper: WallpaperId;
  soundEffects: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  reducedMotionOverride: boolean;
}
