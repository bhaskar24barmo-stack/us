# Phase 4 — Memories & Private Scrapbook

## Features
- **Database (`supabase/migrations/0004_phase4_calls_memories_couple.sql`):**
  - `memory_albums` table + `album_id`, `location`, and `tags` columns on `shared_memories`.
  - Strict RLS (`is_member(conversation_id)`), keeping all memories private to the two approved accounts.
- **UI (`src/features/memories/MemoriesPage.tsx`):**
  - Snapchat-style Stories Ring + Full-Screen Story Viewer.
  - **On This Day** banner matching today's month-day across previous years.
  - Search, Newest/Oldest sort, All/Favorites filter, Grid/Timeline toggle, and private photo/video upload.
