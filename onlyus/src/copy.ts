/**
 * ONLYUS v2 Microcopy Registry
 * All human-facing strings across the app in one single editable file.
 * Tone: short, warm, kind, human. No technical jargon.
 */

export const COPY = {
  appName: 'ONLYUS',
  tagline: 'A private universe for just the two of us.',

  // Navigation (5 core tabs)
  nav: {
    home: 'Home',
    chat: 'Chat',
    memories: 'Memories',
    us: 'Us',
    more: 'More',
    camera: 'Camera',
    calls: 'Calls',
  },

  // Common UI Actions
  actions: {
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved with love ❤️',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    retry: 'Try Again',
    close: 'Close',
    back: 'Back',
    send: 'Send',
    upload: 'Upload Photo',
    copy: 'Copy',
    connect: 'Connect',
    disconnect: 'Disconnect',
    refresh: 'Refresh',
    confirm: 'Confirm',
    gotIt: 'Got it',
  },

  // Home Screen
  home: {
    title: 'Our Space',
    daysTogether: 'Days Together',
    anniversary: 'Anniversary',
    heartbeatPrompt: 'Hold to feel each other',
    dailyQuestionTitle: 'Daily Question for Us',
    dailyQuestionAnswered: 'Both answered! Tap to reveal ✨',
    dailyQuestionPending: 'Waiting for your partner to answer...',
    dailyQuestionPromptMe: 'Write your answer to reveal theirs',
    recentMemory: 'Recent Memory',
    partnerBattery: 'Partner Battery',
    partnerStatus: 'Status',
    partnerOnline: 'Online with you',
    partnerOffline: 'Away for now',
  },

  // Chat Screen
  chat: {
    title: 'Private Chat',
    inputPlaceholder: 'Send a sweet note...',
    isTyping: 'is typing...',
    whisperMode: 'Secret Whisper (Disappears)',
    snapMode: 'Photo Snap 📸',
    audioMode: 'Voice Note 🎙️',
    heartbeatSent: 'Sent a gentle heartbeat 💕',
    whisperTapToReveal: 'Tap to read secret whisper 🤫',
    whisperRevealed: 'Secret Whisper',
    messagePinned: 'Pinned note',
    emptyTitle: 'No messages yet',
    emptyDesc: 'Say hello to your favorite person in the world.',
    emptyAction: 'Send a Love Note 💌',
  },

  // Calls
  calls: {
    title: 'Romantic Calls',
    voiceCall: 'Voice Call',
    videoCall: 'Video Call',
    incomingCall: 'Incoming Call',
    calling: 'Calling your love...',
    connected: 'Connected 💕',
    ended: 'Call Ended',
    ringing: 'Ringing...',
    emptyTitle: 'No calls yet',
    emptyDesc: 'Tap call anytime to hear their sweet voice.',
    emptyAction: 'Start a Call 📞',
  },

  // Memories & Gallery
  memories: {
    title: 'Our Memories',
    subtitle: 'Every smile, snap, and special moment we shared.',
    photoOfTheDay: 'Photo of the Day ✨',
    onThisDay: 'On This Day 📅',
    uploadPrompt: 'Add a new memory to our private vault',
    emptyTitle: 'Your memory album is empty',
    emptyDesc: 'Take a snap together or upload your favorite couple photos.',
    emptyAction: 'Add First Photo 📸',
  },

  // Us Page (Countdowns, Bucket List, Journal, Milestones)
  us: {
    title: 'Just Us',
    subtitle: 'Our journey, dreams, and countdowns.',
    countdowns: 'Countdowns',
    bucketList: 'Bucket List',
    journal: 'Love Letters & Journal',
    milestones: 'Relationship Timeline',
    moodTracker: 'Daily Mood Check-in',
    emptyCountdowns: 'No upcoming countdowns. Add your next trip or anniversary!',
    emptyBucketList: 'Your couple bucket list is empty. What should we do next?',
    emptyJournal: 'No journal entries yet. Write your partner a sweet note.',
  },

  // More & Settings
  more: {
    title: 'Settings & More',
    accountSection: 'Account & Security',
    spaceSection: 'Our Private Space',
    appearanceSection: 'Appearance & Themes',
    notificationsSection: 'Alerts & Chimes',
    toolsSection: 'Couple Tools',
    aboutSection: 'About & Privacy',
    keyboardItem: 'Couple Keyboard & GIFs',
    keyboardDesc: 'System-wide keyboard for WhatsApp & Messages with offline GIFs',
    backupItem: 'Backup & Export',
    backupDesc: 'Export our messages, letters, and photos into a private ZIP',
    securityItem: 'PIN & Biometric Lock',
    securityDesc: 'Lock ONLYUS with fingerprint, face, or 4-digit PIN',
    devicesItem: 'Active Devices',
    devicesDesc: 'Manage and revoke devices linked to our space',
    themeItem: 'Theme Mode',
    themeDark: 'Midnight Dark',
    themeCream: 'Warm Cream (Light)',
    themeAuto: 'Match Phone System',
  },

  // Outbox Status
  outbox: {
    queued: 'Queued offline',
    sending: 'Sending...',
    sent: 'Sent',
    failed: 'Failed to send. Tap to retry.',
  },

  // Error States
  errors: {
    network: 'You seem offline. We will send your messages once reconnected.',
    auth: 'Could not sign in. Please verify your email and password.',
    upload: 'Photo could not be uploaded. Please try a smaller image.',
    generic: 'Something unexpected happened. Your data is safe.',
  },
} as const;

export type CopyRegistry = typeof COPY;
