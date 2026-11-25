-- ONLYUS core schema. Phase 1 (design). RLS is in 0002.
create extension if not exists pgcrypto;

create type message_kind as enum ('text','image','video','voice','file','sticker','gif','love_note','system');
create type call_kind    as enum ('voice','video');
create type call_status  as enum ('ringing','active','ended','missed','declined','failed');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- identity ----------
-- Admin inserts exactly two rows (via SQL editor / service role). Nothing else may sign up.
create table approved_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text not null check (char_length(display_name) between 1 and 40),
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create function enforce_two_approved() returns trigger language plpgsql as $$
begin
  if (select count(*) from approved_users) >= 2 then
    raise exception 'ONLYUS allows exactly two approved users';
  end if;
  return new;
end $$;
create trigger approved_users_max2 before insert on approved_users
  for each row execute function enforce_two_approved();

-- Block any auth.users row whose email is not pre-approved (defence in depth beyond enable_signup=false).
create function gate_auth_signup() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from approved_users where email = lower(new.email)) then
    raise exception 'Not an approved account';
  end if;
  return new;
end $$;
create trigger auth_users_gate before insert on auth.users
  for each row execute function gate_auth_signup();

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_path text,
  accent_color text not null default '#ff4d8d' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  birthday date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- Link auth user -> approved_users, create profile, and join the single conversation.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare a approved_users; cid uuid;
begin
  update approved_users set user_id = new.id where email = lower(new.email) returning * into a;
  insert into profiles (id, display_name) values (new.id, a.display_name);
  select id into cid from conversations limit 1;
  if cid is null then insert into conversations default values returning id into cid; end if;
  insert into conversation_members (conversation_id, user_id) values (cid, new.id);
  insert into notification_preferences (user_id) values (new.id);
  return new;
end $$;

-- ---------- conversation ----------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  disappearing_seconds integer check (disappearing_seconds is null or disappearing_seconds in (10,30,60,3600,86400,604800)),
  created_at timestamptz not null default now()
);
create unique index conversations_single on conversations ((true));  -- exactly one conversation

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create function enforce_two_members() returns trigger language plpgsql as $$
begin
  if (select count(*) from conversation_members where conversation_id = new.conversation_id) >= 2 then
    raise exception 'A conversation has exactly two members';
  end if;
  return new;
end $$;
create trigger members_max2 before insert on conversation_members for each row execute function enforce_two_members();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- messages ----------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,                       -- idempotency key for optimistic UI
  kind message_kind not null default 'text',
  body text check (body is null or char_length(body) <= 4000),
  reply_to_id uuid references messages(id) on delete set null,
  forwarded_from_id uuid references messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  pinned_at timestamptz,
  pinned_by uuid references auth.users(id),
  delivered_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);
create index messages_conv_created on messages (conversation_id, created_at desc);
create index messages_expires on messages (expires_at) where expires_at is not null;
create index messages_pinned on messages (conversation_id) where pinned_at is not null;
create index messages_body_fts on messages using gin (to_tsvector('simple', coalesce(body,'')));

create table message_reactions (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table message_expiration (
  message_id uuid primary key references messages(id) on delete cascade,
  expires_at timestamptz not null,
  purged_at timestamptz
);
create index message_expiration_due on message_expiration (expires_at) where purged_at is null;

-- ---------- media ----------
create table media_attachments (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null default 'private-media',
  storage_path text not null unique,
  thumb_path text,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  width integer, height integer, duration_ms integer,
  caption text check (caption is null or char_length(caption) <= 1000),
  in_gallery boolean not null default false,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index media_conv_created on media_attachments (conversation_id, created_at desc);

create table voice_messages (
  message_id uuid primary key references messages(id) on delete cascade,
  attachment_id uuid not null references media_attachments(id) on delete cascade,
  duration_ms integer not null check (duration_ms between 100 and 600000),
  waveform smallint[] not null default '{}'
);

-- ---------- devices / presence / push ----------
create table user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Unknown device',
  platform text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index user_devices_user on user_devices (user_id);

create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references user_devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_online boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references user_devices(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  failed_count integer not null default 0,
  expired_at timestamptz,
  created_at timestamptz not null default now()
);
create index push_subs_user on push_subscriptions (user_id) where expired_at is null;

create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  messages boolean not null default true,
  calls boolean not null default true,
  media boolean not null default true,
  love_notes boolean not null default true,
  reminders boolean not null default true,
  hide_previews boolean not null default true,
  quiet_start time, quiet_end time,
  timezone text not null default 'UTC',
  muted_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- calls ----------
create table calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  kind call_kind not null,
  status call_status not null default 'ringing',
  answered_at timestamptz, ended_at timestamptz, end_reason text,
  created_at timestamptz not null default now(),
  check (caller_id <> callee_id)
);
create index calls_conv_created on calls (conversation_id, created_at desc);

create table call_participants (
  call_id uuid not null references calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz, left_at timestamptz,
  primary key (call_id, user_id)
);

-- ---------- couple features ----------
create table couple_settings (
  conversation_id uuid primary key references conversations(id) on delete cascade,
  anniversary_date date,
  streak_count integer not null default 0,
  streak_last_date date,
  wallpaper_path text,
  daily_question_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table shared_memories (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'memory' check (kind in ('memory','love_letter','moment')),
  title text not null check (char_length(title) between 1 and 120),
  body text check (body is null or char_length(body) <= 10000),
  memory_date date not null default current_date,
  media_id uuid references media_attachments(id) on delete set null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index memories_conv_date on shared_memories (conversation_id, memory_date desc);
