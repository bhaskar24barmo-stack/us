# ONLYUS ❤️ — Private Two-Person Messaging, Calling & Scrapbook PWA

ONLYUS is a private messaging, camera, WebRTC/LiveKit calling, memories scrapbook, and couple space ("Us") built exclusively for two approved users using React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, and Supabase (Auth, PostgreSQL + RLS, Realtime, Storage).

## Documentation
- [Phase 2 Auth & Security Hardening](docs/phase2-auth.md)
- [Phase 3 Real-Time Chat & Media](docs/phase3-chat.md)
- [Phase 4 Calls](docs/phase4-calls.md)
- [Phase 4 Memories](docs/phase4-memories.md)
- [Phase 4 Notifications](docs/phase4-notifications.md)
- [Phase 4 Couple Features ("Us")](docs/phase4-couple-features.md)
- [Project Roadmap & Status](TODO.md)

## Local Development
```bash
npm install
npm run typecheck
npm run build
npm run dev
```

## Database Migrations
Run in order in the Supabase SQL Editor:
1. `supabase/migrations/0001_core_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_phase2_hardening_and_phase3.sql`
4. `supabase/migrations/0004_phase4_calls_memories_couple.sql`
5. Verify with `supabase/tests/rls_test.sql`

## Deployment
Deploy to Vercel from `onlyus/`:
```bash
npx vercel --prod
```
Ensure Node.js version is set to `22.x` or `24.x` in Vercel Project Settings.
