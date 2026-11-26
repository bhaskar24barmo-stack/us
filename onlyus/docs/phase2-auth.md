# ONLYUS — Phase 2 Authentication & Security Hardening

## Security Architecture
- **Two-User Enforcement:** `approved_users` has a `BEFORE INSERT` trigger (`enforce_two_approved`) capping the table at 2 rows, and `auth.users` has `gate_auth_signup` (`BEFORE INSERT`) blocking any unapproved email even if public signup is toggled.
- **Row Level Security (RLS):** Every table in `0001_core_schema.sql` has RLS enabled in `0002_rls.sql`. Policies require `is_approved()` and `is_member(conversation_id)`.
- **Phase 2 Hardening (`0003_phase2_hardening_and_phase3.sql`):**
  - `guard_message_update()` trigger prevents senders from forging `read_at`, `delivered_at`, `pinned_at`, `pinned_by`, `sender_id`, `conversation_id`, or `client_id`.
  - Recipient read receipts (`mark_messages_read`) and member pinning (`toggle_message_pin`) run through `SECURITY DEFINER` RPCs that verify membership.
  - `message_reactions` primary key updated to `(message_id, user_id, emoji)` to support multiple distinct emoji reactions per user.
- **Live Device Revocation:** `AuthGate` subscribes to `user_devices` updates via `subscribeDeviceRevocation()` (`src/services/devices.ts`) and signs out active sessions immediately when `revoked_at` is set.
- **PIN Lock Privacy:** `LockGate` (`src/features/lock/LockGate.tsx`) unmounts protected children from the DOM whenever `locked === true`, preventing DOM inspection of messages or media.
- **Local Biometric Disclosure:** WebAuthn biometric unlock (`src/features/lock/lockStore.ts`) is strictly a local device user-presence check and is explicitly labeled as **not server-verified** in `SecuritySettings.tsx`.
- **Private Media Validation:** `src/services/mediaStorage.ts` validates allowed MIME types and a 25 MB client upload cap (100 MB bucket limit) before uploading to `private-media` and serves time-limited signed URLs.
