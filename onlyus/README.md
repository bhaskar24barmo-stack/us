# ONLYUS ❤️

A futuristic, romantic, Snapchat-inspired private messaging application designed exclusively for two people.

> **Prototype Status:** This build runs 100% locally in the browser with simulated authentication, local persistence (`localStorage`), real browser Camera/Microphone/MediaRecorder APIs, and a WebRTC-ready calling architecture. No Supabase or external paid services are required to run or deploy this prototype on Vercel.

## Features Implemented

- **Splash & Onboarding:** Animated ONLYUS ❤️ logo, floating heart particles, Welcome screen, Simulated Demo Login (2 predefined profiles: **Me** and **My Girlfriend**), and Profile customization.
- **5-Tab Bottom Navigation:** Animated `Chats`, `Calls`, elevated `Camera`, `Our World` (Memories), and `Profile`.
- **Private Chat Experience:** Message bubbles with themes, timestamps, delivered/read receipts, typing indicator, reply, edit, delete, reactions, pinned message banner, search with empty states, date separators, disappearing message timer (`∞` / `10s` / `30s`), live Heartbeat Pulse (`💓`), 1-tap quick love prompts, gallery attachment preview before sending, scroll-to-bottom button, voice notes, stickers, real animated GIF keyboard (`src/services/gifs.ts` with optional Tenor API search), and **Simulate Partner Text / Sticker Reply** buttons.
- **Snapchat-Style Camera:** Real `getUserMedia` live preview, front/rear switch, flash toggle, photo capture with shutter flash, video recording (`MediaRecorder`), gallery upload, filters, 90° rotate, crop toggle, freehand drawing canvas, and captions. Graceful fallback when camera permission is denied.
- **Full-Screen Media Viewer:** Swipe/prev-next navigation, image zoom, video playback controls, captions, reactions, save to Memories, and delete with object URL cleanup.
- **Voice Messages:** `MediaRecorder` audio capture, live waveform, timer, play/pause, 1x / 1.5x / 2x playback speed, and discard/send.
- **Calling Interface (LiveKit-Ready):** Outgoing, incoming, and active Voice & Video call UIs with pulsing incoming ring animations, voice waveform bars, in-call floating hearts, real local camera/mic preview, mute, camera toggle, camera switch, minimize PiP, timer, call history, `src/services/livekit.ts` adapter, and clearly labelled **Simulated Remote Caller Mode**.
- **Notifications:** In-app toast stack, Notification Centre drawer, sound chime, quiet hours, preview toggle, and optional Browser `Notification` API.
- **Stickers & Reactions:** 27 animated stickers across 9 categories (Love, Cute, Funny, Romantic, Good morning, Good night, Hugs, Kisses, Hearts), favorites, recents, 64-emoji picker, and 8 GIF cards.
- **Our World (Couple Features):** Couple streak with confetti celebration, live ticking **Together Since** counter, anniversary & birthday countdowns, daily love question, daily romantic message, love letter composer & archive, shared gallery with empty states, and relationship timeline.
- **Profile, Settings & App Lock:** Dark/light theme, chat bubble themes, wallpapers, local PBKDF2 PIN + WebAuthn App Lock, responsive phone-frame layout, automatic PWA **InstallAppBar** (`beforeinstallprompt` + iOS Safari guidance), PWA manifest + icons, and Vercel SPA routing (`vercel.json`).

## Run Locally

```bash
cd onlyus
npm install
npm run dev
```

## Build & Deploy (Vercel)

- **Root Directory:** `onlyus`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- No environment variables are required for Prototype Mode.

## Future Supabase & LiveKit Integration

`src/lib/supabase.ts`, `src/services/livekit.ts`, and `src/services/webrtc.ts` are structured so Supabase Auth, Postgres Realtime messages, Storage buckets, and LiveKit Voice/Video rooms (`VITE_LIVEKIT_URL`, `VITE_LIVEKIT_TOKEN_ENDPOINT`) can be wired in without rewriting the UI. See `TODO.md` for the production checklist.
