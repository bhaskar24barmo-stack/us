# Phase 4 — Notifications & Web Push

## In-App & Database
- `notifications` table (`0004_phase4_calls_memories_couple.sql`) protected by `notifs_own` RLS (`user_id = auth.uid() and is_approved()`).
- `src/features/notifications/NotificationCenter.tsx`: Unread badge, mark-read, mark-all-read, clear all, sound toggle, quiet hours (`quietHoursEnabled`), and message preview privacy toggle.

## Web Push (VAPID) Setup
Browser background push requires:
1. Generating a VAPID keypair (`npx web-push generate-vapid-keys`).
2. Setting `VITE_VAPID_PUBLIC_KEY` in client `.env` and `VAPID_PRIVATE_KEY` + `SUPABASE_SERVICE_ROLE_KEY` strictly server-side in Supabase Edge Function secrets (`supabase/functions/send-push/index.ts`).
3. Registering a custom `injectManifest` Service Worker (`src/sw.ts`) to handle `push` and `notificationclick` events.
