-- Phase 4: Calls, Memories, Notifications & Couple ("Us") Features
-- Additive migration on top of 0001, 0002, 0003.

-- 1. Memory albums + extended shared_memories metadata
create table if not exists memory_albums (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table shared_memories
  add column if not exists album_id uuid references memory_albums(id) on delete set null,
  add column if not exists location text,
  add column if not exists tags text[] not null default '{}';

-- 2. In-app notifications table (per-user)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('message','incoming_call','missed_call','reaction','reply','memory','anniversary','special_date','love_note','streak')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 500),
  read boolean not null default false,
  action_route text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on notifications (user_id, created_at desc);

-- 3. Couple ("Us") tables: shared_notes, important_dates, daily_questions, daily_answers
create table if not exists shared_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  pinned boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists important_dates (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  event_date date not null,
  kind text not null default 'custom' check (kind in ('birthday','anniversary','first_meeting','first_date','custom')),
  remind_days_before integer not null default 3 check (remind_days_before between 0 and 30),
  created_at timestamptz not null default now()
);

create table if not exists daily_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null unique,
  active_date date not null default current_date
);

create table if not exists daily_answers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  question_id uuid not null references daily_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (conversation_id, question_id, user_id)
);

-- 4. Enable RLS & policies on all new Phase 4 tables
do $$ declare t text; begin
  foreach t in array array['memory_albums','notifications','shared_notes','important_dates','daily_questions','daily_answers']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

create policy albums_member on memory_albums for all
  using (is_member(conversation_id))
  with check (is_member(conversation_id) and created_by = auth.uid());

create policy notifs_own on notifications for all
  using (user_id = auth.uid() and is_approved())
  with check (user_id = auth.uid() and is_approved());

create policy notes_member on shared_notes for all
  using (is_member(conversation_id))
  with check (is_member(conversation_id));

create policy dates_member on important_dates for all
  using (is_member(conversation_id))
  with check (is_member(conversation_id));

create policy dq_read on daily_questions for select
  using (is_approved());

create policy da_member on daily_answers for select
  using (is_member(conversation_id));
create policy da_write on daily_answers for insert
  with check (is_member(conversation_id) and user_id = auth.uid());
create policy da_update on daily_answers for update
  using (is_member(conversation_id) and user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. Updated-at trigger on shared_notes & seed couple_settings for existing conversation
drop trigger if exists shared_notes_updated on shared_notes;
create trigger shared_notes_updated
  before update on shared_notes
  for each row execute function set_updated_at();

insert into couple_settings (conversation_id)
select id from conversations
on conflict (conversation_id) do nothing;
