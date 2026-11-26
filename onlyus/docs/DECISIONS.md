# ONLYUS — Architecture & Engineering Decisions

This log records key technical decisions made during Phases 3–11 (decision, reason, alternatives considered).

---

## 1. Additive Migration `0006_master_hardening_and_couple.sql`
- **Decision:** Keep existing migrations `0001` through `0005` untouched and add all new hardening triggers, RPCs, and couple tables in `0006_master_hardening_and_couple.sql`.
- **Reason:** Migrations `0001`–`0005` are already applied to the live Supabase project (`kxnmyfikfozlnlurdmgu`). Modifying historical migrations causes schema drift.
- **Alternative:** Resetting the database and rewriting `0003` — rejected to preserve live data and migration history.

## 2. Hybrid WebRTC + LiveKit Calling Architecture
- **Decision:** Support direct WebRTC (`RTCPeerConnection` with STUN/TURN credentials from `turn-credentials` and state-machine enforcement via `signal-guard`) alongside optional `livekit-client` room support when `VITE_LIVEKIT_URL` is configured.
- **Reason:** Direct WebRTC + TURN works out-of-the-box with Supabase Realtime private channels and Edge Functions without requiring an external LiveKit server, while keeping LiveKit available for upgraded SFU routing.
- **Alternative:** LiveKit-only calling — rejected because it requires external LiveKit Cloud credentials before calls can connect.

## 3. Android APK Build Strategy (Capacitor 6 + GitHub Actions)
- **Decision:** Generate and commit the Capacitor 6 `android/` project with full release signing config, ProGuard/R8 rules, and `.github/workflows/android-apk.yml` for tagged `v*` builds.
- **Reason:** JDK 17 and the Android SDK (`ANDROID_HOME`) are not installed on the local Windows build host. GitHub Actions (`ubuntu-latest` with `actions/setup-java@v4` and `android-actions/setup-android@v3`) produces reproducible signed APKs and attaches them to GitHub Releases.
- **Alternative:** Failing on missing local JDK — rejected; documenting local install steps in `docs/HUMAN_STEPS.md` while automating CI builds ensures reliable delivery.

## 4. Service Worker `injectManifest` Strategy for Web Push
- **Decision:** Switch `vite-plugin-pwa` from `generateSW` to `injectManifest` with `src/sw.ts`.
- **Reason:** `generateSW` cannot handle incoming `push` events, privacy-safe payload rendering, or `notificationclick` deep-linking.
- **Alternative:** Custom standalone `sw.js` outside VitePWA — rejected because `injectManifest` preserves precaching of the app shell while keeping API/auth/storage excluded.
