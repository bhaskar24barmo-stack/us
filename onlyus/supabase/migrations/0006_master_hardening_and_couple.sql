-- Phase 3+: Master Hardening, Read/Delivery RPCs, Disappearing Triggers, Couple Tables & RLS
-- Additive & idempotent migration on top of 0001..0005.

-- ============================================================================
-- 1. Authorized Read, Delivery & Pin RPCs (Transaction-Local GUC Pattern)
-- ============================================================================

create or replace function public.mark_delivered(
  cid uuid,
  up_to timestamptz default pg_catalog.now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
  cutoff timestamptz := coalesce(up_to, pg_catalog.now());
begin
  if not public.is_member(cid) then
    raise exception 'Not a conversation member';
  end if;

  perform pg_catalog.set_config('app.rpc_message_update', 'true', true);
  begin
    update public.messages
    set delivered_at = coalesce(delivered_at, pg_catalog.now())
    where conversation_id = cid
      and sender_id <> (select auth.uid())
      and created_at <= cutoff
      and delivered_at is null;

    get diagnostics updated_count = row_count;
  exception when others then
    perform pg_catalog.set_config('app.rpc_message_update', 'false', true);
    raise;
  end;
  perform pg_catalog.set_config('app.rpc_message_update', 'false', true);

  return updated_count;
end;
$$;

create or replace function public.mark_read(
  cid uuid,
  up_to timestamptz default pg_catalog.now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
  cutoff timestamptz := coalesce(up_to, pg_catalog.now());
begin
  if not public.is_member(cid) then
    raise exception 'Not a conversation member';
  end if;

  perform pg_catalog.set_config('app.rpc_message_update', 'true', true);
  begin
    update public.messages
    set read_at = coalesce(read_at, pg_catalog.now()),
        delivered_at = coalesce(delivered_at, pg_catalog.now())
    where conversation_id = cid
      and sender_id <> (select auth.uid())
      and created_at <= cutoff
      and read_at is null;

    get diagnostics updated_count = row_count;
  exception when others then
    perform pg_catalog.set_config('app.rpc_message_update', 'false', true);
    raise;
  end;
  perform pg_catalog.set_config('app.rpc_message_update', 'false', true);

  update public.conversation_members
  set last_read_at = greatest(last_read_at, cutoff)
  where conversation_id = cid
    and user_id = (select auth.uid());

  return updated_count;
end;
$$;

create or replace function public.mark_messages_read(cid uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.mark_read(cid, pg_catalog.now());
end;
$$;

create or replace function public.toggle_message_pin(mid uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
  next_pin timestamptz;
begin
  select conversation_id,
         case when pinned_at is null then pg_catalog.now() else null end
  into cid, next_pin
  from public.messages
  where id = mid;

  if cid is null or not public.is_member(cid) then
    raise exception 'Not authorized to pin this message';
  end if;

  perform pg_catalog.set_config('app.rpc_message_update', 'true', true);
  begin
    update public.messages
    set pinned_at = next_pin,
        pinned_by = case when next_pin is null then null else (select auth.uid()) end
    where id = mid;
  exception when others then
    perform pg_catalog.set_config('app.rpc_message_update', 'false', true);
    raise;
  end;
  perform pg_catalog.set_config('app.rpc_message_update', 'false', true);

  return next_pin;
end;
$$;

-- ============================================================================
-- 2. Column-Level BEFORE UPDATE Guards
-- ============================================================================

create or replace function public.guard_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.client_id <> old.client_id
     or new.kind <> old.kind
     or new.created_at <> old.created_at
     or new.reply_to_id is distinct from old.reply_to_id
     or new.forwarded_from_id is distinct from old.forwarded_from_id
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Cannot modify immutable message fields';
  end if;

  if pg_catalog.current_setting('app.rpc_message_update', true) = 'true' then
    if new.body is distinct from old.body
       or new.edited_at is distinct from old.edited_at
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'RPC cannot modify message content or deletion state';
    end if;
    return new;
  end if;

  if new.delivered_at is distinct from old.delivered_at
     or new.read_at is distinct from old.read_at
     or new.pinned_at is distinct from old.pinned_at
     or new.pinned_by is distinct from old.pinned_by then
    raise exception 'Use authorized RPCs to update receipts or pin state';
  end if;

  if old.deleted_at is not null then
    if new.deleted_at is null
       or new.deleted_at is distinct from old.deleted_at
       or new.body is distinct from old.body
       or new.edited_at is distinct from old.edited_at then
      raise exception 'Deleted messages cannot be modified or restored';
    end if;
    return new;
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    new.body := null;
    return new;
  end if;

  if new.edited_at is distinct from old.edited_at
     and new.body is not distinct from old.body then
    raise exception 'Cannot update edited_at without changing message body';
  end if;

  if new.body is distinct from old.body then
    if old.created_at < pg_catalog.now() - interval '24 hours' then
      raise exception 'Messages can only be edited within 24 hours';
    end if;
    new.edited_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_message_update on public.messages;
create trigger trg_guard_message_update
  before update on public.messages
  for each row execute function public.guard_message_update();

create or replace function public.guard_conversation_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id or new.created_at <> old.created_at then
    raise exception 'Only disappearing_seconds may be modified on conversations';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_conversation_update on public.conversations;
create trigger trg_guard_conversation_update
  before update on public.conversations
  for each row execute function public.guard_conversation_update();

create or replace function public.guard_shared_memory_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.author_id <> old.author_id
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable memory fields';
  end if;

  if (select auth.uid()) is distinct from old.author_id then
    if new.kind is distinct from old.kind
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.memory_date is distinct from old.memory_date
       or new.media_id is distinct from old.media_id
       or new.album_id is distinct from old.album_id
       or new.location is distinct from old.location
       or new.tags is distinct from old.tags then
      raise exception 'Only the author can edit memory content or metadata';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_shared_memory_update on public.shared_memories;
create trigger trg_guard_shared_memory_update
  before update on public.shared_memories
  for each row execute function public.guard_shared_memory_update();

create or replace function public.guard_couple_settings_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    new.updated_at := pg_catalog.now();
    return new;
  end if;

  if new.conversation_id <> old.conversation_id then
    raise exception 'Cannot modify immutable couple_settings fields';
  end if;

  if new.streak_count is distinct from old.streak_count
     or new.streak_last_date is distinct from old.streak_last_date then
    if pg_catalog.current_setting('app.rpc_streak_update', true) is distinct from 'true' then
      raise exception 'Streak fields are read-only and managed by update_streak()';
    end if;
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists trg_guard_couple_settings_update on public.couple_settings;
create trigger trg_guard_couple_settings_update
  before update on public.couple_settings
  for each row execute function public.guard_couple_settings_update();

-- ============================================================================
-- 3. Disappearing Messages & Media Purge Hardening
-- ============================================================================

create or replace function public.set_message_expiration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dsec integer;
begin
  if new.expires_at is null then
    select disappearing_seconds into dsec
    from public.conversations
    where id = new.conversation_id;

    if dsec is not null then
      new.expires_at := coalesce(new.created_at, pg_catalog.now()) + pg_catalog.make_interval(secs => dsec);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_message_expiration on public.messages;
create trigger trg_set_message_expiration
  before insert on public.messages
  for each row execute function public.set_message_expiration();

create or replace function public.track_message_expiration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.expires_at is not null then
    insert into public.message_expiration (message_id, expires_at)
    values (new.id, new.expires_at)
    on conflict (message_id) do update set expires_at = excluded.expires_at;

    update public.media_attachments
    set expires_at = coalesce(expires_at, new.expires_at)
    where message_id = new.id
      and expires_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_track_message_expiration on public.messages;
create trigger trg_track_message_expiration
  after insert or update of expires_at on public.messages
  for each row execute function public.track_message_expiration();

create or replace function public.sync_media_expiration_from_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg_exp timestamptz;
begin
  if new.message_id is not null and new.expires_at is null then
    select m.expires_at into msg_exp
    from public.messages m
    where m.id = new.message_id;

    if msg_exp is not null then
      new.expires_at := msg_exp;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_media_expiration_from_message on public.media_attachments;
create trigger trg_sync_media_expiration_from_message
  before insert or update of message_id on public.media_attachments
  for each row execute function public.sync_media_expiration_from_message();

create index if not exists media_attachments_message_id_idx
  on public.media_attachments (message_id)
  where message_id is not null;

-- Drop CASCADE FK on message_expiration so purged_at audit records survive hard-deletion of messages
alter table public.message_expiration
  drop constraint if exists message_expiration_message_id_fkey;

-- Hide expired media rows immediately in RLS while waiting for cleanup-expired cron
drop policy if exists media_read on public.media_attachments;
create policy media_read on public.media_attachments
  for select
  to authenticated
  using (
    public.is_member(conversation_id)
    and deleted_at is null
    and (expires_at is null or expires_at > pg_catalog.now())
  );

-- ============================================================================
-- 4. Full-Text Search RPC
-- ============================================================================

create or replace function public.search_messages(
  search_query text,
  lim integer default 30,
  cursor_ts timestamptz default null
)
returns setof public.messages
language sql
stable
security definer
set search_path = ''
as $$
  select m.*
  from public.messages m
  where public.is_member(m.conversation_id)
    and m.deleted_at is null
    and m.body is not null
    and (cursor_ts is null or m.created_at < cursor_ts)
    and pg_catalog.to_tsvector('simple', coalesce(m.body, ''))
        @@ pg_catalog.plainto_tsquery('simple', search_query)
  order by m.created_at desc
  limit least(greatest(lim, 1), 100);
$$;

-- ============================================================================
-- 5. Media Albums, Favorites & Couple Features Tables
-- ============================================================================

alter table public.memory_albums
  add column if not exists cover_media_id uuid references public.media_attachments(id) on delete set null;

create table if not exists public.album_items (
  album_id uuid not null references public.memory_albums(id) on delete cascade,
  media_id uuid not null references public.media_attachments(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (album_id, media_id)
);

create table if not exists public.media_favorites (
  media_id uuid not null references public.media_attachments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (media_id, user_id)
);

create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  target_at timestamptz not null,
  emoji text not null default '✨',
  repeat_yearly boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists countdowns_conv_target
  on public.countdowns (conversation_id, target_at);

create table if not exists public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  notes text default '' check (char_length(notes) <= 2000),
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  sort integer not null default 0,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists bucket_conv_created
  on public.bucket_list_items (conversation_id, sort, created_at);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null default '' check (char_length(body) <= 20000),
  mood text,
  visibility text not null default 'shared' check (visibility in ('shared', 'private')),
  entry_date date not null default current_date,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);
create index if not exists journal_conv_created
  on public.journal_entries (conversation_id, entry_date desc, created_at desc);

drop trigger if exists journal_entries_updated on public.journal_entries;
create trigger journal_entries_updated
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

create table if not exists public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (char_length(mood) between 1 and 32),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists mood_conv_created
  on public.mood_checkins (conversation_id, created_at desc);

create table if not exists public.pings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'thinking_of_you' check (kind in ('thinking_of_you','miss_you','hug','kiss')),
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists pings_conv_created
  on public.pings (conversation_id, created_at desc);

create or replace function public.enforce_ping_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.pings
    where sender_id = new.sender_id
      and created_at > pg_catalog.now() - interval '10 seconds'
  ) then
    raise exception 'Please wait 10 seconds before sending another ping';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ping_rate_limit on public.pings;
create trigger trg_ping_rate_limit
  before insert on public.pings
  for each row execute function public.enforce_ping_rate_limit();

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind public.message_kind not null default 'love_note',
  body text check (body is null or char_length(body) <= 4000),
  media_id uuid references public.media_attachments(id) on delete set null,
  send_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists scheduled_due
  on public.scheduled_messages (send_at)
  where sent_at is null and cancelled_at is null;

create or replace function public.guard_scheduled_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.kind <> old.kind
     or new.body is distinct from old.body
     or new.media_id is distinct from old.media_id
     or new.send_at <> old.send_at
     or new.sent_at is distinct from old.sent_at
     or new.created_at <> old.created_at then
    raise exception 'Only cancelled_at may be updated on scheduled messages';
  end if;

  if old.sent_at is not null then
    raise exception 'Cannot modify an already sent scheduled message';
  end if;

  if old.cancelled_at is not null and new.cancelled_at is distinct from old.cancelled_at then
    raise exception 'Scheduled message is already cancelled';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_scheduled_message_update on public.scheduled_messages;
create trigger trg_guard_scheduled_message_update
  before update on public.scheduled_messages
  for each row execute function public.guard_scheduled_message_update();

-- Immutability guards for shared collaborative tables
create or replace function public.guard_bucket_list_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable bucket list fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_bucket_list_update on public.bucket_list_items;
create trigger trg_guard_bucket_list_update
  before update on public.bucket_list_items
  for each row execute function public.guard_bucket_list_update();

create or replace function public.guard_countdown_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable countdown fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_countdown_update on public.countdowns;
create trigger trg_guard_countdown_update
  before update on public.countdowns
  for each row execute function public.guard_countdown_update();

create or replace function public.guard_album_item_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.album_id <> old.album_id
     or new.media_id <> old.media_id
     or new.added_by <> old.added_by
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable album item fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_album_item_update on public.album_items;
create trigger trg_guard_album_item_update
  before update on public.album_items
  for each row execute function public.guard_album_item_update();

create or replace function public.guard_memory_album_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.created_by <> old.created_by
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable memory album fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_memory_album_update on public.memory_albums;
create trigger trg_guard_memory_album_update
  before update on public.memory_albums
  for each row execute function public.guard_memory_album_update();

-- ============================================================================
-- 6. Extend push_subscriptions & calls
-- ============================================================================

alter table public.push_subscriptions
  add column if not exists provider text not null default 'webpush',
  add column if not exists fcm_token text;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_provider_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_provider_check check (provider in ('webpush', 'fcm'));

alter table public.push_subscriptions alter column endpoint drop not null;
alter table public.push_subscriptions alter column p256dh drop not null;
alter table public.push_subscriptions alter column auth drop not null;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_provider_fields_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_provider_fields_check check (
    (provider = 'webpush' and endpoint is not null and p256dh is not null and auth is not null)
    or (provider = 'fcm' and fcm_token is not null)
  );

create unique index if not exists push_subs_user_device_provider
  on public.push_subscriptions (user_id, device_id, provider)
  where device_id is not null;

create index if not exists push_subs_fcm_token_idx
  on public.push_subscriptions (fcm_token)
  where fcm_token is not null;

alter table public.calls
  add column if not exists ice_restarts integer not null default 0,
  add column if not exists duration_seconds integer;

-- ============================================================================
-- 7. Timezone Helpers, Daily Questions (120), Daily Answers & Streak/Summary
-- ============================================================================

create or replace function public.safe_ts_date(p_ts timestamptz, p_tz text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  return (p_ts at time zone coalesce(nullif(pg_catalog.btrim(p_tz), ''), 'UTC'))::date;
exception when invalid_parameter_value then
  return (p_ts at time zone 'UTC')::date;
end;
$$;

create or replace function public.safe_local_date(p_tz text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  return public.safe_ts_date(pg_catalog.now(), p_tz);
end;
$$;

create or replace function public.effective_timezone(p_uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select nullif(pg_catalog.btrim(np.timezone), '')
      from public.notification_preferences np
      where np.user_id = p_uid
      limit 1
    ),
    'UTC'
  );
$$;

create or replace function public.couple_timezone(p_cid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select nullif(pg_catalog.btrim(np.timezone), '')
      from public.conversation_members cm
      join public.notification_preferences np on np.user_id = cm.user_id
      where cm.conversation_id = p_cid
        and nullif(pg_catalog.btrim(np.timezone), '') is not null
        and np.timezone <> 'UTC'
      order by cm.joined_at asc
      limit 1
    ),
    'UTC'
  );
$$;

-- Daily answers: add answer_date, unique constraint, triggers, recursion-free RLS
alter table public.daily_answers
  add column if not exists answer_date date not null default (pg_catalog.now() at time zone 'UTC')::date;

alter table public.daily_answers
  alter column answer_date set default null;

alter table public.daily_answers
  drop constraint if exists daily_answers_conversation_id_question_id_user_id_key;
alter table public.daily_answers
  drop constraint if exists daily_answers_conv_q_user_date_key;
alter table public.daily_answers
  add constraint daily_answers_conv_q_user_date_key
  unique (conversation_id, question_id, user_id, answer_date);

create index if not exists daily_answers_conv_q_date_idx
  on public.daily_answers (conversation_id, question_id, answer_date);

create or replace function public.set_daily_answer_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.answer_date := coalesce(
    new.answer_date,
    public.safe_local_date(public.couple_timezone(new.conversation_id))
  );
  return new;
end;
$$;

drop trigger if exists trg_set_daily_answer_date on public.daily_answers;
create trigger trg_set_daily_answer_date
  before insert on public.daily_answers
  for each row execute function public.set_daily_answer_date();

create or replace function public.guard_daily_answer_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
     or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return new;
  end if;

  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.question_id <> old.question_id
     or new.user_id <> old.user_id
     or new.answer_date <> old.answer_date
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable daily answer fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_daily_answer_update on public.daily_answers;
create trigger trg_guard_daily_answer_update
  before update on public.daily_answers
  for each row execute function public.guard_daily_answer_update();

create or replace function public.has_answered_daily_question(
  p_cid uuid,
  p_qid uuid,
  p_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.daily_answers da
    where da.conversation_id = p_cid
      and da.question_id = p_qid
      and da.answer_date = p_date
      and da.user_id = (select auth.uid())
  );
$$;

drop policy if exists da_member on public.daily_answers;
create policy da_member on public.daily_answers
  for select
  to authenticated
  using (
    public.is_member(conversation_id)
    and (
      user_id = (select auth.uid())
      or answer_date < (select public.safe_local_date(public.couple_timezone(conversation_id)))
      or public.has_answered_daily_question(conversation_id, question_id, answer_date)
    )
  );

drop policy if exists da_write on public.daily_answers;
create policy da_write on public.daily_answers
  for insert
  to authenticated
  with check (
    public.is_member(conversation_id)
    and user_id = (select auth.uid())
  );

drop policy if exists da_update on public.daily_answers;
create policy da_update on public.daily_answers
  for update
  to authenticated
  using (public.is_member(conversation_id) and user_id = (select auth.uid()))
  with check (public.is_member(conversation_id) and user_id = (select auth.uid()));

-- Seed 120 unique daily questions
insert into public.daily_questions (prompt) values
  ('What is a tiny moment with me this week that made you smile?'),
  ('Where should our next spontaneous weekend trip be?'),
  ('What song immediately reminds you of us?'),
  ('What is something I do that makes you feel most loved?'),
  ('What is one dream we haven''t planned yet that you want to do together?'),
  ('What was your first impression of me?'),
  ('What is your favorite memory of us laughing uncontrollably?'),
  ('If we had an entire Sunday with zero responsibilities, what would we do?'),
  ('What meal should we cook together next?'),
  ('What is one thing you are proud of me for lately?'),
  ('Which photo of us is your all-time favorite and why?'),
  ('What habit of mine do you secretly find adorable?'),
  ('What is a movie or series we should rewatch cuddling?'),
  ('When did you first realize how much you cared about me?'),
  ('What is one thing you want to learn or try together this year?'),
  ('What is your favorite way for us to spend a rainy evening?'),
  ('What compliment from me has stuck with you the longest?'),
  ('If you could relive one day we spent together, which day would it be?'),
  ('What makes you feel safest when we are together?'),
  ('What is a small ritual you want us to keep forever?'),
  ('What scent or flavor always makes you think of me?'),
  ('Where do you imagine us waking up on a peaceful holiday morning?'),
  ('What is something new you learned about me recently?'),
  ('What little text from me always brightens your whole day?'),
  ('If we created a signature cocktail or mocktail together, what would be in it?'),
  ('What is the best surprise I have ever given you?'),
  ('Which inside joke of ours still makes you laugh out loud?'),
  ('What does a perfect date night at home look like to you?'),
  ('What is one challenge we overcame that made us stronger?'),
  ('If we could teleport anywhere for dinner tonight, where would we go?'),
  ('What part of my voice or laugh do you love most?'),
  ('What is one thing on your mind right now that I can support you with?'),
  ('What adventure from our past feels like it happened in a movie?'),
  ('If we wrote a short book about us, what would the title be?'),
  ('What small chore or gesture from me feels like a big love letter?'),
  ('What season of the year feels most like "our" season?'),
  ('What is a childhood favorite snack or game you want to share with me?'),
  ('When you miss me during a busy day, what memory pops up first?'),
  ('What is one skill or hobby of mine you admire?'),
  ('If we had a free afternoon with no phones, how would we spend it?'),
  ('What kind of home decor or cozy detail do you picture in our shared space?'),
  ('What was a quiet moment between us that meant more than words?'),
  ('Which song should definitely play in the soundtrack of our lives?'),
  ('What is something I do when I''m sleepy or distracted that you find cute?'),
  ('What goal of yours would you love us to celebrate together soon?'),
  ('What kind of trip have we never taken yet that excites you?'),
  ('How do I look at you when I''m happiest?'),
  ('What is the best piece of advice or comfort I''ve ever given you?'),
  ('If we started a Sunday morning tradition, what would it be?'),
  ('What is a place in our city or town that holds a special memory for us?'),
  ('What made you fall even more in love with me over time?'),
  ('What is one thing you want more of in our lives this month?'),
  ('If we could pause time for one hour tonight, what would we do?'),
  ('What is a silly argument we had that feels funny looking back?'),
  ('What kind of weather makes you want to stay wrapped up together?'),
  ('What is your favorite way I greet you after time apart?'),
  ('What dream destination should move to the top of our bucket list?'),
  ('What is something you were nervous to tell me once, that you''re glad you shared?'),
  ('What little detail about my daily routine do you love noticing?'),
  ('If we cooked a three-course dinner together, who handles which course?'),
  ('What is one thing we do effortlessly well as a team?'),
  ('What photo or video of us do you look back at when you need a boost?'),
  ('What kind of surprise would make your week right now?'),
  ('What is a promise you silently keep for us every day?'),
  ('What late-night conversation of ours do you still remember clearly?'),
  ('If we adopted a pet or named a plant together today, what would its name be?'),
  ('What is your favorite outfit or look on me?'),
  ('When did you feel most understood by me?'),
  ('What is a tiny luxury we should treat ourselves to soon?'),
  ('What is something you look forward to doing with me five years from now?'),
  ('What emoji or phrase feels uniquely ours?'),
  ('What kind of music would you put on for a long drive together?'),
  ('What is one stress you want to leave behind this weekend?'),
  ('What food did we discover together that became a favorite?'),
  ('How has loving me changed the way you see yourself?'),
  ('What is one thing you want to thank me for today?'),
  ('If we had a whole week in a cabin or beach house, what would we pack first?'),
  ('What is a subtle sign that tells you when I need a hug?'),
  ('Which celebration or holiday with me are you most excited for next?'),
  ('What is the bravest thing you''ve seen me do?'),
  ('What simple pleasure do we enjoy together that costs nothing?'),
  ('If we recreated our first date today, what would we keep the same?'),
  ('What is something you hope we never stop doing even when we''re old?'),
  ('What movie scene or quote reminds you of our relationship?'),
  ('What time of day do you feel closest to me?'),
  ('What is one habit we should build together this month?'),
  ('What did I say or do recently that made you feel truly heard?'),
  ('If we picked a secret code word for "I need a cuddle," what would it be?'),
  ('What is your favorite shared memory involving food or coffee?'),
  ('What is one place you want to watch a sunrise or sunset with me?'),
  ('What quality of ours as a couple makes you feel proudest?'),
  ('What is a small project we could finish together over a weekend?'),
  ('When you picture us laughing ten years from now, where are we?'),
  ('What is something thoughtful I did that you didn''t realize I noticed?'),
  ('If we swapped playlists for a day, what track would you make sure I didn''t skip?'),
  ('What is one way I can make tomorrow easier or sweeter for you?'),
  ('What kind of spontaneous adventure sounds fun for next Saturday?'),
  ('What is a favorite memory of us just talking for hours?'),
  ('What makes our relationship feel different from anything else?'),
  ('If we left a time capsule to open in five years, what would you put inside?'),
  ('What is one thing about my personality that balances yours?'),
  ('What is a cozy ritual that instantly signals it''s "us time"?'),
  ('What did you feel the very first time we held hands or hugged?'),
  ('What kind of game or friendly competition should we play tonight?'),
  ('What is one compliment you don''t hear enough that is completely true?'),
  ('If we planned a themed movie marathon, what would the theme and snacks be?'),
  ('What is a small change that made our days together happier?'),
  ('What memory of ours feels warmest on a cold or tiring day?'),
  ('What is one thing you want to celebrate about us right now?'),
  ('If we spent a morning exploring a neighborhood or market, what would we look for?'),
  ('What is something you adore about how we communicate?'),
  ('What song would you dedicate to me tonight without saying a word?'),
  ('What is one fear or worry you feel safe sharing with me?'),
  ('What makes coming back to me at the end of the day feel like home?'),
  ('If we had an extra day off tomorrow, what is the first thing you''d suggest?'),
  ('What is a tiny kindness of yours I might not know how much you put thought into?'),
  ('What is your favorite way for us to say goodnight?'),
  ('What moment recently reminded you why you chose me?'),
  ('If you could bottle one feeling from our time together, what would it be?'),
  ('What is one thing you want us to dream bigger about together?')
on conflict (prompt) do nothing;

create or replace function public.get_daily_question(p_date date default (pg_catalog.now() at time zone 'UTC')::date)
returns table (id uuid, prompt text)
language sql
stable
security definer
set search_path = ''
as $$
  with ordered as (
    select dq.id,
           dq.prompt,
           row_number() over (order by dq.id) - 1 as idx,
           count(*) over () as total
    from public.daily_questions dq
  )
  select ordered.id, ordered.prompt
  from ordered
  where ordered.idx = ((greatest(0, coalesce(p_date, (pg_catalog.now() at time zone 'UTC')::date) - date '2026-01-01')) % ordered.total)
  limit 1;
$$;

-- Timezone-aware Streak Calculation & Home Summary RPC
create or replace function public.update_streak(cid uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_cid uuid := cid;
  tz text;
  today_d date;
  distinct_senders integer;
  cur_streak integer := 0;
  old_streak integer := 0;
  last_d date;
begin
  if target_cid is null then
    select id into target_cid from public.conversations limit 1;
  end if;
  if target_cid is null then
    return 0;
  end if;

  tz := public.couple_timezone(target_cid);
  today_d := public.safe_local_date(tz);

  select count(distinct m.sender_id) into distinct_senders
  from public.messages m
  where m.conversation_id = target_cid
    and m.deleted_at is null
    and m.kind <> 'system'
    and public.safe_ts_date(m.created_at, tz) = today_d;

  select cs.streak_count, cs.streak_last_date
  into cur_streak, last_d
  from public.couple_settings cs
  where cs.conversation_id = target_cid;

  old_streak := coalesce(cur_streak, 0);

  if last_d is not null and last_d < today_d - 1 then
    cur_streak := 0;
  end if;

  if distinct_senders >= 2 and (last_d is null or last_d < today_d) then
    cur_streak := coalesce(cur_streak, 0) + 1;
    perform pg_catalog.set_config('app.rpc_streak_update', 'true', true);
    begin
      update public.couple_settings
      set streak_count = cur_streak,
          streak_last_date = today_d
      where conversation_id = target_cid;
    exception when others then
      perform pg_catalog.set_config('app.rpc_streak_update', 'false', true);
      raise;
    end;
    perform pg_catalog.set_config('app.rpc_streak_update', 'false', true);
  elsif last_d is not null and last_d < today_d - 1 and old_streak <> 0 then
    perform pg_catalog.set_config('app.rpc_streak_update', 'true', true);
    begin
      update public.couple_settings
      set streak_count = 0
      where conversation_id = target_cid;
    exception when others then
      perform pg_catalog.set_config('app.rpc_streak_update', 'false', true);
      raise;
    end;
    perform pg_catalog.set_config('app.rpc_streak_update', 'false', true);
  end if;

  return coalesce(cur_streak, 0);
end;
$$;

create or replace function public.trg_update_streak_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'system' then
    return new;
  end if;
  perform public.update_streak(new.conversation_id);
  return new;
end;
$$;

drop trigger if exists trg_messages_streak on public.messages;
create trigger trg_messages_streak
  after insert on public.messages
  for each row execute function public.trg_update_streak_on_message();

create or replace function public.get_home_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  tz text;
  today_d date;
  cs public.couple_settings;
  unread_cnt integer := 0;
  next_cd jsonb;
  partner_mood jsonb;
  recent_mem jsonb;
  q_id uuid;
  q_prompt text;
  my_ans text;
  partner_ans text;
  q_today jsonb := null;
begin
  if uid is null or not public.is_approved() then
    return '{}'::jsonb;
  end if;

  select cm.conversation_id into cid
  from public.conversation_members cm
  where cm.user_id = uid
  limit 1;

  if cid is null then
    return '{}'::jsonb;
  end if;

  tz := public.couple_timezone(cid);
  today_d := public.safe_local_date(tz);

  select * into cs
  from public.couple_settings
  where conversation_id = cid;

  select count(*) into unread_cnt
  from public.messages m
  where m.conversation_id = cid
    and m.sender_id <> uid
    and m.read_at is null
    and m.deleted_at is null;

  select pg_catalog.jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'target_at', c.target_at,
    'emoji', c.emoji,
    'repeat_yearly', c.repeat_yearly
  )
  into next_cd
  from public.countdowns c
  where c.conversation_id = cid
    and c.target_at >= pg_catalog.now()
  order by c.target_at asc
  limit 1;

  select pg_catalog.jsonb_build_object(
    'mood', mc.mood,
    'note', mc.note,
    'created_at', mc.created_at
  )
  into partner_mood
  from public.mood_checkins mc
  where mc.conversation_id = cid
    and mc.user_id <> uid
  order by mc.created_at desc
  limit 1;

  select pg_catalog.jsonb_build_object(
    'id', sm.id,
    'title', sm.title,
    'kind', sm.kind,
    'memory_date', sm.memory_date,
    'media_id', sm.media_id,
    'is_favorite', sm.is_favorite
  )
  into recent_mem
  from public.shared_memories sm
  where sm.conversation_id = cid
  order by sm.memory_date desc, sm.created_at desc
  limit 1;

  select dq.id, dq.prompt
  into q_id, q_prompt
  from public.get_daily_question(today_d) dq;

  if q_id is not null then
    select da.answer into my_ans
    from public.daily_answers da
    where da.conversation_id = cid
      and da.question_id = q_id
      and da.answer_date = today_d
      and da.user_id = uid
    limit 1;

    select da.answer into partner_ans
    from public.daily_answers da
    where da.conversation_id = cid
      and da.question_id = q_id
      and da.answer_date = today_d
      and da.user_id <> uid
    limit 1;

    q_today := pg_catalog.jsonb_build_object(
      'id', q_id,
      'prompt', q_prompt,
      'answer_date', today_d,
      'my_answered', my_ans is not null,
      'partner_answered', partner_ans is not null,
      'my_answer', my_ans,
      'partner_answer', case when my_ans is not null then partner_ans else null end
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'conversation_id', cid,
    'anniversary_date', cs.anniversary_date,
    'days_together', case when cs.anniversary_date is not null then greatest(0, today_d - cs.anniversary_date) else 0 end,
    'streak_count', coalesce(cs.streak_count, 0),
    'streak_last_date', cs.streak_last_date,
    'daily_question_enabled', coalesce(cs.daily_question_enabled, true),
    'wallpaper_path', cs.wallpaper_path,
    'unread_count', unread_cnt,
    'next_countdown', next_cd,
    'partner_mood', partner_mood,
    'recent_memory', recent_mem,
    'daily_question', q_today
  );
end;
$$;

-- ============================================================================
-- 8. Enable RLS & Split Policies (Explicit TO authenticated + (select auth.uid()))
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'album_items',
    'media_favorites',
    'countdowns',
    'bucket_list_items',
    'journal_entries',
    'mood_checkins',
    'pings',
    'scheduled_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- memory_albums (fix 0004 FOR ALL bug so partner can edit shared album title/cover)
drop policy if exists albums_member on public.memory_albums;
drop policy if exists albums_select on public.memory_albums;
drop policy if exists albums_insert on public.memory_albums;
drop policy if exists albums_update on public.memory_albums;
drop policy if exists albums_delete on public.memory_albums;

create policy albums_select on public.memory_albums
  for select to authenticated
  using (public.is_member(conversation_id));
create policy albums_insert on public.memory_albums
  for insert to authenticated
  with check (public.is_member(conversation_id) and created_by = (select auth.uid()));
create policy albums_update on public.memory_albums
  for update to authenticated
  using (public.is_member(conversation_id))
  with check (public.is_member(conversation_id));
create policy albums_delete on public.memory_albums
  for delete to authenticated
  using (public.is_member(conversation_id));

-- album_items
drop policy if exists album_items_member on public.album_items;
drop policy if exists album_items_select on public.album_items;
drop policy if exists album_items_insert on public.album_items;
drop policy if exists album_items_update on public.album_items;
drop policy if exists album_items_delete on public.album_items;

create policy album_items_select on public.album_items
  for select to authenticated
  using (
    exists (
      select 1 from public.memory_albums a
      where a.id = album_items.album_id
        and public.is_member(a.conversation_id)
    )
  );
create policy album_items_insert on public.album_items
  for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and exists (
      select 1 from public.memory_albums a
      where a.id = album_items.album_id
        and public.is_member(a.conversation_id)
    )
    and exists (
      select 1 from public.media_attachments m
      where m.id = album_items.media_id
        and public.is_member(m.conversation_id)
    )
  );
create policy album_items_update on public.album_items
  for update to authenticated
  using (
    exists (
      select 1 from public.memory_albums a
      where a.id = album_items.album_id
        and public.is_member(a.conversation_id)
    )
  )
  with check (
    exists (
      select 1 from public.memory_albums a
      where a.id = album_items.album_id
        and public.is_member(a.conversation_id)
    )
  );
create policy album_items_delete on public.album_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.memory_albums a
      where a.id = album_items.album_id
        and public.is_member(a.conversation_id)
    )
  );

-- media_favorites
drop policy if exists media_fav_own on public.media_favorites;
create policy media_fav_own on public.media_favorites
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.media_attachments m
      where m.id = media_favorites.media_id
        and public.is_member(m.conversation_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.media_attachments m
      where m.id = media_favorites.media_id
        and public.is_member(m.conversation_id)
    )
  );

-- countdowns
drop policy if exists countdowns_member on public.countdowns;
drop policy if exists countdowns_select on public.countdowns;
drop policy if exists countdowns_insert on public.countdowns;
drop policy if exists countdowns_update on public.countdowns;
drop policy if exists countdowns_delete on public.countdowns;

create policy countdowns_select on public.countdowns
  for select to authenticated
  using (public.is_member(conversation_id));
create policy countdowns_insert on public.countdowns
  for insert to authenticated
  with check (public.is_member(conversation_id) and created_by = (select auth.uid()));
create policy countdowns_update on public.countdowns
  for update to authenticated
  using (public.is_member(conversation_id))
  with check (public.is_member(conversation_id));
create policy countdowns_delete on public.countdowns
  for delete to authenticated
  using (public.is_member(conversation_id));

-- bucket_list_items
drop policy if exists bucket_member on public.bucket_list_items;
drop policy if exists bucket_select on public.bucket_list_items;
drop policy if exists bucket_insert on public.bucket_list_items;
drop policy if exists bucket_update on public.bucket_list_items;
drop policy if exists bucket_delete on public.bucket_list_items;

create policy bucket_select on public.bucket_list_items
  for select to authenticated
  using (public.is_member(conversation_id));
create policy bucket_insert on public.bucket_list_items
  for insert to authenticated
  with check (public.is_member(conversation_id) and created_by = (select auth.uid()));
create policy bucket_update on public.bucket_list_items
  for update to authenticated
  using (public.is_member(conversation_id))
  with check (public.is_member(conversation_id));
create policy bucket_delete on public.bucket_list_items
  for delete to authenticated
  using (public.is_member(conversation_id));

-- journal_entries
drop policy if exists journal_read on public.journal_entries;
drop policy if exists journal_write on public.journal_entries;
drop policy if exists journal_update on public.journal_entries;
drop policy if exists journal_delete on public.journal_entries;

create policy journal_read on public.journal_entries
  for select to authenticated
  using (public.is_member(conversation_id) and (visibility = 'shared' or author_id = (select auth.uid())));
create policy journal_write on public.journal_entries
  for insert to authenticated
  with check (public.is_member(conversation_id) and author_id = (select auth.uid()));
create policy journal_update on public.journal_entries
  for update to authenticated
  using (public.is_member(conversation_id) and author_id = (select auth.uid()))
  with check (public.is_member(conversation_id) and author_id = (select auth.uid()));
create policy journal_delete on public.journal_entries
  for delete to authenticated
  using (public.is_member(conversation_id) and author_id = (select auth.uid()));

-- mood_checkins
drop policy if exists mood_member on public.mood_checkins;
drop policy if exists mood_write on public.mood_checkins;

create policy mood_member on public.mood_checkins
  for select to authenticated
  using (public.is_member(conversation_id));
create policy mood_write on public.mood_checkins
  for insert to authenticated
  with check (public.is_member(conversation_id) and user_id = (select auth.uid()));

-- pings
drop policy if exists pings_member on public.pings;
drop policy if exists pings_write on public.pings;

create policy pings_member on public.pings
  for select to authenticated
  using (public.is_member(conversation_id));
create policy pings_write on public.pings
  for insert to authenticated
  with check (public.is_member(conversation_id) and sender_id = (select auth.uid()));

-- scheduled_messages
drop policy if exists scheduled_member on public.scheduled_messages;
drop policy if exists scheduled_write on public.scheduled_messages;
drop policy if exists scheduled_update on public.scheduled_messages;

create policy scheduled_member on public.scheduled_messages
  for select to authenticated
  using (
    public.is_member(conversation_id)
    and (sender_id = (select auth.uid()) or sent_at is not null)
  );
create policy scheduled_write on public.scheduled_messages
  for insert to authenticated
  with check (
    public.is_member(conversation_id)
    and sender_id = (select auth.uid())
    and sent_at is null
  );
create policy scheduled_update on public.scheduled_messages
  for update to authenticated
  using (public.is_member(conversation_id) and sender_id = (select auth.uid()))
  with check (public.is_member(conversation_id) and sender_id = (select auth.uid()));

-- ============================================================================
-- 9. Storage Policies (UUID-Safe & Membership-Verified Delete)
-- ============================================================================

drop policy if exists storage_read on storage.objects;
create policy storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'private-media'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then public.is_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

drop policy if exists storage_insert on storage.objects;
create policy storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'private-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then public.is_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

drop policy if exists storage_delete on storage.objects;
create policy storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'private-media'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        then public.is_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

-- ============================================================================
-- 10. Realtime Private Channels RLS (conv:<cid> & call:<call_id>)
-- ============================================================================

create or replace function public.can_access_realtime_topic(p_topic text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  target_id uuid;
begin
  if p_topic is null or not public.is_approved() then
    return false;
  end if;

  if p_topic ~ '^conv:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    target_id := pg_catalog.substr(p_topic, 6)::uuid;
    return public.is_member(target_id);
  end if;

  if p_topic ~ '^call:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    target_id := pg_catalog.substr(p_topic, 6)::uuid;
    return exists (
      select 1
      from public.calls c
      where c.id = target_id
        and public.is_member(c.conversation_id)
        and (select auth.uid()) in (c.caller_id, c.callee_id)
    );
  end if;

  return false;
end;
$$;

-- Note: RLS is already enabled on realtime.messages (owned by supabase_realtime_admin)
drop policy if exists realtime_messages_select on realtime.messages;
create policy realtime_messages_select
  on realtime.messages
  for select
  to authenticated
  using (
    extension in ('broadcast', 'presence')
    and public.can_access_realtime_topic((select realtime.topic()))
  );

drop policy if exists realtime_messages_insert on realtime.messages;
create policy realtime_messages_insert
  on realtime.messages
  for insert
  to authenticated
  with check (
    extension in ('broadcast', 'presence')
    and public.can_access_realtime_topic(
      coalesce(nullif(topic, ''), (select realtime.topic()))
    )
  );

-- ============================================================================
-- 11. Security Grants, Revokes & Advisor Hardening
-- ============================================================================

revoke all on function public.mark_delivered(uuid, timestamptz) from public, anon;
grant execute on function public.mark_delivered(uuid, timestamptz) to authenticated;

revoke all on function public.mark_read(uuid, timestamptz) from public, anon;
grant execute on function public.mark_read(uuid, timestamptz) to authenticated;

revoke all on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

revoke all on function public.toggle_message_pin(uuid) from public, anon;
grant execute on function public.toggle_message_pin(uuid) to authenticated;

revoke all on function public.search_messages(text, integer, timestamptz) from public, anon;
grant execute on function public.search_messages(text, integer, timestamptz) to authenticated;

revoke all on function public.get_home_summary() from public, anon;
grant execute on function public.get_home_summary() to authenticated;

revoke all on function public.get_daily_question(date) from public, anon;
grant execute on function public.get_daily_question(date) to authenticated;

revoke all on function public.has_answered_daily_question(uuid, uuid, date) from public, anon;
grant execute on function public.has_answered_daily_question(uuid, uuid, date) to authenticated;

revoke all on function public.safe_ts_date(timestamptz, text) from public, anon;
grant execute on function public.safe_ts_date(timestamptz, text) to authenticated;

revoke all on function public.safe_local_date(text) from public, anon;
grant execute on function public.safe_local_date(text) to authenticated;

revoke all on function public.effective_timezone(uuid) from public, anon;
grant execute on function public.effective_timezone(uuid) to authenticated;

revoke all on function public.couple_timezone(uuid) from public, anon;
grant execute on function public.couple_timezone(uuid) to authenticated;

revoke all on function public.can_access_realtime_topic(text) from public, anon;
grant execute on function public.can_access_realtime_topic(text) to authenticated;

revoke all on function public.update_streak(uuid) from public, anon, authenticated;
revoke all on function public.guard_message_update() from public, anon, authenticated;
revoke all on function public.guard_conversation_update() from public, anon, authenticated;
revoke all on function public.guard_shared_memory_update() from public, anon, authenticated;
revoke all on function public.guard_couple_settings_update() from public, anon, authenticated;
revoke all on function public.guard_scheduled_message_update() from public, anon, authenticated;
revoke all on function public.guard_bucket_list_update() from public, anon, authenticated;
revoke all on function public.guard_countdown_update() from public, anon, authenticated;
revoke all on function public.guard_album_item_update() from public, anon, authenticated;
revoke all on function public.guard_memory_album_update() from public, anon, authenticated;
revoke all on function public.guard_daily_answer_update() from public, anon, authenticated;
revoke all on function public.set_daily_answer_date() from public, anon, authenticated;
revoke all on function public.set_message_expiration() from public, anon, authenticated;
revoke all on function public.track_message_expiration() from public, anon, authenticated;
revoke all on function public.sync_media_expiration_from_message() from public, anon, authenticated;
revoke all on function public.enforce_ping_rate_limit() from public, anon, authenticated;
revoke all on function public.trg_update_streak_on_message() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- ============================================================================
-- 12. Realtime Publication
-- ============================================================================

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'countdowns',
    'bucket_list_items',
    'journal_entries',
    'mood_checkins',
    'pings',
    'daily_answers',
    'couple_settings',
    'memory_albums',
    'album_items',
    'media_favorites'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- ============================================================================
-- 13. pg_cron & pg_net Extensions + Vault-Guarded Scheduled Jobs
-- ============================================================================

do $$
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'Skipping pg_cron/pg_net creation: %', sqlerrm;
end $$;

do $$
declare
  jid bigint;
  jname text;
begin
  if to_regnamespace('cron') is not null then
    foreach jname in array array[
      'onlyus-streak-check',
      'onlyus-cleanup-expired',
      'onlyus-scheduled-reminders'
    ]
    loop
      for jid in select jobid from cron.job where jobname = jname loop
        perform cron.unschedule(jid);
      end loop;
    end loop;

    perform cron.schedule(
      'onlyus-streak-check',
      '5,35 * * * *',
      'select public.update_streak(null);'
    );

    if to_regnamespace('net') is not null
       and to_regnamespace('vault') is not null then
      perform cron.schedule(
        'onlyus-cleanup-expired',
        '* * * * *',
        $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/cleanup-expired',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
          ),
          body := '{}'::jsonb
        )
        where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
          and exists (select 1 from vault.decrypted_secrets where name = 'service_role_key');
        $job$
      );

      perform cron.schedule(
        'onlyus-scheduled-reminders',
        '* * * * *',
        $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/scheduled-reminders',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
          ),
          body := '{}'::jsonb
        )
        where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
          and exists (select 1 from vault.decrypted_secrets where name = 'service_role_key');
        $job$
      );
    end if;
  end if;
end $$;
