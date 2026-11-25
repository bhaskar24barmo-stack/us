# ONLYUS ❤️ — TODO & Production Roadmap

## Prototype Status (Completed)
- [x] Design system (deep black, midnight purple, neon pink, electric violet, glassmorphism, dark/light themes)
- [x] Splash screen, Welcome, Simulated Demo Auth (Me / My Girlfriend), Profile Setup
- [x] 5-tab animated mobile bottom navigation
- [x] Full private chat experience with localStorage persistence, disappearing timer (`∞`/`10s`/`30s`), Heartbeat Pulse, attachment preview, scroll-to-bottom & simulated partner text/sticker replies
- [x] Real animated GIF keyboard with search, category chips & optional Tenor API support (`src/services/gifs.ts`)
- [x] Automatic PWA Install Bar (`InstallAppBar.tsx`) for `beforeinstallprompt` & iOS Safari
- [x] Live ticking Together Since counter in Our World
- [x] Snapchat-style Camera with real `getUserMedia`, filters, crop/rotate, drawing canvas, and gallery upload
- [x] Full-screen Photo & Video viewer with zoom, reactions, save to gallery, and object URL cleanup
- [x] Real `MediaRecorder` voice notes with playback speed (1x / 1.5x / 2x)
- [x] Voice & Video calling UI with pulsing incoming animations, voice waveform, in-call hearts, LiveKit-ready adapter (`src/services/livekit.ts`), and Simulated Remote Caller Mode
- [x] Phone-matched centered mobile frame on desktop (`max-w-[430px]`) and full-bleed mobile layout
- [x] In-app Notification Centre, preferences, and Browser Notification API integration
- [x] 9-category animated Sticker Picker (27 stickers), 64-emoji picker, and 8 GIF Cards
- [x] Our World couple hub (streak + confetti, countdowns, love letter composer + archive, gallery, timeline)
- [x] Profile, Settings, light/dark mode contrast fixes, and local PBKDF2 + WebAuthn App Lock
- [x] Smooth route transitions (`PageTransition`), responsive desktop framing, PWA manifest, placeholder PNG icons, and `vercel.json`

## Remaining for Production (Supabase + Push + WebRTC)
- [ ] Connect `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel
- [ ] Replace simulated demo login with Supabase Auth (`authStore.ts`) and 2-user RLS allowlist
- [ ] Sync `messages`, `calls`, `memories`, and `love_letters` to Supabase Postgres + Realtime subscriptions
- [ ] Upload photos, videos, and voice notes to private Supabase Storage with signed URLs
- [ ] Install `livekit-client` and connect `LiveKitCallAdapter` (`src/services/livekit.ts`) with `VITE_LIVEKIT_URL` + `VITE_LIVEKIT_TOKEN_ENDPOINT`
- [ ] Configure Web Push VAPID keys + `injectManifest` service worker for background push notifications
