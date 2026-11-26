# ONLYUS — Architecture Overview

## Stack
- **Web / PWA:** React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Zustand + React Router, deployed to Vercel.
- **Android APK:** Capacitor 6 (`com.onlyus.app`) wrapping the bundled `dist/` web app with native bridges (`src/features/native/capacitorBridge.ts`).
- **Backend:** Supabase (Auth, Postgres with RLS, Realtime private channels, Private Storage `private-media`, Deno Edge Functions).

## Privacy & Security Model
1. **Two-User Enforcement:** `approved_users` limits the app to at most 2 pre-approved accounts; public sign-ups are disabled.
2. **Row-Level Security (RLS) + Column Guards:** All tables enforce `is_member(conversation_id)`. `BEFORE UPDATE` triggers prevent tampering with immutable columns (`sender_id`, `client_id`, `created_at`). Read/delivery ticks go through `security definer` RPCs (`mark_delivered`, `mark_read`).
3. **Private Media Storage:** `private-media` is private. Short-lived signed URLs (5 minutes) are generated on demand and cached in memory.
4. **Zero Tracking:** No analytics, no ad SDKs, no third-party error trackers. Diagnostic reports copy a redacted local bundle only when the user clicks "Report a Problem".

## Messaging Reliability
- **Optimistic Outbox (`src/features/chat/outbox.ts`):** Uses IndexedDB (`idb`) with `client_id` UUID idempotency (`unique(sender_id, client_id)`) so offline sends never get lost or duplicated.
- **Realtime Manager (`src/services/realtimeManager.ts`):** Subscribes to `conv:<conversationId>` and gap-fills missed messages on app resume or network reconnect.

## Calls & Notifications
- **Calls:** `signal-guard` enforces caller/callee membership, single-call busy check, and valid state transitions (`ringing -> active -> ended`). `turn-credentials` issues 1-hour HMAC TURN credentials.
- **Notifications:** Web Push via custom Service Worker (`src/sw.ts` with `injectManifest`), Android Push via FCM (`@capacitor/push-notifications`). Privacy mode (`hide_previews`) hides message content on lock screens by default.
- **Android Background Call Limitations (Best-Effort):** Aggressive OEM battery killers (Xiaomi/Oppo/Vivo) may delay background FCM wakeups unless the user sets Battery to "Unrestricted". Full-screen incoming call intents require Android `USE_FULL_SCREEN_INTENT` permission on Android 14+.
