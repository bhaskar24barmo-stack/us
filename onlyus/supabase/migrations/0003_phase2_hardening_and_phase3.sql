-- Phase 2 Security Hardening + Phase 3 Chat Schema Alignment
-- Do NOT modify 0001_core_schema.sql or 0002_rls.sql; all changes are additive.

-- 1. Extend message_kind enum for Phase 3 rich message types
alter type message_kind add value if not exists 'poll';
alter type message_kind add value if not exists 'whisper';
alter type message_kind add value if not exists 'song';

-- 2. Add missing profile fields used by the client
alter table profiles
  add column if not exists nickname text,
  add column if not exists avatar_emoji text default '🖤',
  add column if not exists bio text default '',
  add column if not exists status_text text default 'Online';

-- 3. Allow multiple distinct emoji reactions per user per message
alter table message_reactions drop constraint if exists message_reactions_pkey;
alter table message_reactions add primary key (message_id, user_id, emoji);

-- 4. Guard messages UPDATE so senders cannot forge read_at, delivered_at, pinned_at, or sender_id
create or replace function guard_message_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow service_role / postgres migrations
  if auth.uid() is null then
    return new;
  end if;

  -- Immutable identity & structural fields
  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.client_id <> old.client_id
     or new.kind <> old.kind
     or new.created_at <> old.created_at then
    raise exception 'Cannot modify immutable message fields';
  end if;

  -- Senders cannot forge recipient delivery/read receipts or pin metadata directly
  if new.delivered_at is distinct from old.delivered_at
     or new.read_at is distinct from old.read_at
     or new.pinned_at is distinct from old.pinned_at
     or new.pinned_by is distinct from old.pinned_by then
    raise exception 'Use authorized RPCs to update receipts or pin state';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_message_update on messages;
create trigger trg_guard_message_update
  before update on messages
  for each row execute function guard_message_update();

-- 5. Authorized RPCs for recipient read/delivery receipts & member pinning
create or replace function mark_messages_read(cid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare updated_count integer;
begin
  if not is_member(cid) then
    raise exception 'Not a conversation member';
  end if;

  update messages
  set read_at = coalesce(read_at, now()),
      delivered_at = coalesce(delivered_at, now())
  where conversation_id = cid
    and sender_id <> auth.uid()
    and read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function toggle_message_pin(mid uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid; next_pin timestamptz;
begin
  select conversation_id, case when pinned_at is null then now() else null end
  into cid, next_pin
  from messages
  where id = mid;

  if cid is null or not is_member(cid) then
    raise exception 'Not authorized to pin this message';
  end if;

  update messages
  set pinned_at = next_pin,
      pinned_by = case when next_pin is null then null else auth.uid() end
  where id = mid;

  return next_pin;
end;
$$;

-- 6. Enforce device revocation check RPC
create or replace function is_device_active(did uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_devices
    where id = did
      and user_id = auth.uid()
      and revoked_at is null
  );
$$;
