# ONLYUS — Phase 3 Real-Time Chat & Media

## Implemented Modules
- **Realtime Sync (`src/services/chatSync.ts`):**
  - `fetchConversationMessages(conversationId, limit, beforeIso)` for paginated history loading.
  - `subscribeToConversation(conversationId, handler)` using Supabase Realtime `postgres_changes`.
  - `markConversationReadRpc` and `toggleMessagePinRpc` backed by `0003_phase2_hardening_and_phase3.sql`.
- **Private Storage (`src/services/mediaStorage.ts`):**
  - `validateMediaFile()` enforces MIME whitelist (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`, `audio/mp4`, `audio/webm`, `audio/ogg`) and size limits.
  - `uploadPrivateMedia()` uploads to `private-media/<conversation_id>/<owner_id>/<uuid>.<ext>` and returns 1-hour signed URLs.
- **Presence & Live Room Pairing (`src/services/presence.ts`):**
  - `OpenPresenceClient` uses Supabase Realtime Presence + Broadcast scoped by the shared `pairCode` (`onlyus-room-<pairCode>`), with `BroadcastChannel` fallback.
- **Disappearing Messages:**
  - Configurable `Off`, `24h`, `7d`, `30d` expiration timers.
  - *Note:* Disappearing messages automatically expire in storage/database, but cannot prevent screenshots, screen recordings, or manual copies on the recipient's device.
