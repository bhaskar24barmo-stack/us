# Phase 4 — WebRTC Video & Audio Calling

## Architecture
- `src/services/webrtc.ts`: `CallSessionController` manages `navigator.mediaDevices.getUserMedia`, `RTCPeerConnection` track publishing, ICE candidate exchange, connection-state monitoring, and automatic `restartIce()` on `disconnected`/`failed`.
- `createSupabaseSignaling(conversationId, userId, handlers)` exchanges SDP offers/answers and ICE candidates over Supabase Realtime (`onlyus-webrtc-<conversationId>`).
- `src/features/calls/ActiveCallOverlay.tsx` & `CallsPage.tsx`: Full-screen audio/video call UI, mute/unmute, camera on/off, front/rear camera switch, speaker toggle, live mic-level visualizer, minimize PiP, and call history.

## TURN Server Configuration
Public STUN (`stun:stun.l.google.com:19302`) is enabled by default, but mobile/symmetric NAT networks require a TURN server. Set these environment variables (never hardcode credentials):
- `VITE_TURN_URL` (e.g. `turns:your-turn-host:5349`)
- `VITE_TURN_USERNAME`
- `VITE_TURN_CREDENTIAL`

Or deploy a TURN credential minting Edge Function at `supabase/functions/turn-credentials/index.ts`.
