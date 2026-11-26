const EN_STRINGS: Record<string, string> = {
  'app.name': 'ONLYUS',
  'app.tagline': 'A private space for two.',
  'nav.home': 'Home',
  'nav.chats': 'Chats',
  'nav.gallery': 'Gallery',
  'nav.calls': 'Calls',
  'nav.camera': 'Camera',
  'nav.more': 'More',
  'nav.profile': 'Profile',
  'chat.placeholder': 'Message…',
  'chat.sending': 'Sending…',
  'chat.failed_retry': 'Failed — tap to retry',
  'chat.deleted': 'This message was deleted',
  'calls.voice': 'Voice Call',
  'calls.video': 'Video Call',
  'calls.reconnecting': 'Reconnecting…',
  'gallery.save_phone': 'Save to phone',
  'couple.thinking': 'Thinking of you',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
};

export function t(key: string, fallback?: string): string {
  return EN_STRINGS[key] ?? fallback ?? key;
}
