# ONLYUS — Roadmap & Status

## Completed
- [x] Phase 1: Core schema, 2-user triggers, and PWA shell
- [x] Phase 2 Hardening (`0003_phase2_hardening_and_phase3.sql`):
  - `guard_message_update()` trigger blocking receipt/pin/sender tampering
  - `mark_messages_read` and `toggle_message_pin` `SECURITY DEFINER` RPCs
  - Live device revocation subscription in `AuthGate` + `devices.ts`
  - `LockGate` unmounts protected children when locked
  - Honest local-only biometric labeling in `SecuritySettings.tsx`
  - MIME & size validation in `src/services/mediaStorage.ts`
- [x] Phase 3 Chat & Media:
  - `src/services/chatSync.ts` (Realtime `postgres_changes` + pagination)
  - `src/services/presence.ts` (Pairing Code scoped Supabase Presence + Broadcast)
  - Disappearing message options (`Off`, `24h`, `7d`, `30d`)
- [x] Phase 4 Calls, Memories, Notifications & Couple ("Us"):
  - `0004_phase4_calls_memories_couple.sql` (`memory_albums`, `notifications`, `shared_notes`, `important_dates`, `daily_questions`, `daily_answers` + RLS)
  - `src/services/webrtc.ts` (`createSupabaseSignaling`, configurable STUN/TURN, ICE restart)
  - `src/features/us/UsPage.tsx` (Our Days Together Y/M/D, Important Dates, Shared Notes, Daily Question, Love Notes)
  - `MemoriesPage.tsx` (Stories, On This Day, Search, Newest/Oldest Sort, Bucket List, Date Night Roulette)
  - `BottomNav.tsx` 6-section navigation (`Chats`, `Calls`, `Camera`, `Memories`, `Us`, `Profile`)
  - `ProfilePage.tsx` 6 chat themes (Midnight Purple, Rose Pink, Ocean Blue, AMOLED Black, Sunset, Lavender Dream)

## Remaining External Infrastructure
- [ ] Configure `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` (or `turn-credentials` Edge Function) for NAT-traversed WebRTC calls
- [ ] Configure VAPID keys + `injectManifest` Service Worker (`src/sw.ts`) + `send-push` Edge Function for background Web Push
- [ ] Schedule `cleanup-expired` Edge Function via `pg_cron` for server-side media purge
