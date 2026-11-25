-- Row Level Security. Every policy requires BOTH approved status and conversation membership.
create or replace function is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from approved_users where user_id = auth.uid())
$$;

create or replace function is_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_approved() and exists (
    select 1 from conversation_members where conversation_id = cid and user_id = auth.uid())
$$;

do $$ declare t text; begin
  foreach t in array array['approved_users','profiles','conversations','conversation_members','messages',
    'message_reactions','message_expiration','media_attachments','voice_messages','user_devices','user_sessions',
    'user_presence','push_subscriptions','notification_preferences','calls','call_participants',
    'couple_settings','shared_memories']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- approved_users: read-only, own row. Writes only via service role.
create policy approved_self on approved_users for select using (user_id = auth.uid());

-- profiles: both partners read; only owner writes.
create policy profiles_read on profiles for select using (
  is_approved() and exists (select 1 from conversation_members a join conversation_members b
    on a.conversation_id = b.conversation_id where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on profiles for update using (id = auth.uid() and is_approved()) with check (id = auth.uid());

create policy conv_read on conversations for select using (is_member(id));
create policy conv_update on conversations for update using (is_member(id)) with check (is_member(id));
create policy members_read on conversation_members for select using (is_member(conversation_id));

-- messages: members read; insert only as yourself; only sender edits/deletes (soft). No hard delete from client.
create policy msg_read on messages for select using (is_member(conversation_id));
create policy msg_insert on messages for insert with check (is_member(conversation_id) and sender_id = auth.uid());
create policy msg_update on messages for update using (is_member(conversation_id) and sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy react_read on message_reactions for select using (
  exists (select 1 from messages m where m.id = message_id and is_member(m.conversation_id)));
create policy react_write on message_reactions for insert with check (
  user_id = auth.uid() and exists (select 1 from messages m where m.id = message_id and is_member(m.conversation_id)));
create policy react_update on message_reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy react_delete on message_reactions for delete using (user_id = auth.uid());

create policy exp_read on message_expiration for select using (
  exists (select 1 from messages m where m.id = message_id and is_member(m.conversation_id)));

create policy media_read on media_attachments for select using (is_member(conversation_id) and deleted_at is null);
create policy media_insert on media_attachments for insert with check (is_member(conversation_id) and owner_id = auth.uid());
create policy media_update on media_attachments for update using (is_member(conversation_id) and owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy voice_read on voice_messages for select using (
  exists (select 1 from messages m where m.id = message_id and is_member(m.conversation_id)));
create policy voice_insert on voice_messages for insert with check (
  exists (select 1 from messages m where m.id = message_id and m.sender_id = auth.uid() and is_member(m.conversation_id)));

-- Per-user private tables.
create policy devices_own on user_devices for all using (user_id = auth.uid() and is_approved()) with check (user_id = auth.uid());
create policy sessions_own on user_sessions for select using (user_id = auth.uid());
create policy push_own on push_subscriptions for all using (user_id = auth.uid() and is_approved()) with check (user_id = auth.uid());
create policy notif_own on notification_preferences for all using (user_id = auth.uid() and is_approved()) with check (user_id = auth.uid());

-- Presence: own write; partner can read.
create policy presence_read on user_presence for select using (
  is_approved() and exists (select 1 from conversation_members a join conversation_members b
    on a.conversation_id = b.conversation_id where a.user_id = auth.uid() and b.user_id = user_presence.user_id));
create policy presence_write on user_presence for insert with check (user_id = auth.uid() and is_approved());
create policy presence_update on user_presence for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Calls: participants read. Creating/updating call state goes through Edge Functions (service role) in Phase 6.
create policy calls_read on calls for select using (is_member(conversation_id) and auth.uid() in (caller_id, callee_id));
create policy call_part_read on call_participants for select using (
  exists (select 1 from calls c where c.id = call_id and is_member(c.conversation_id)));

create policy couple_read on couple_settings for select using (is_member(conversation_id));
create policy couple_update on couple_settings for update using (is_member(conversation_id)) with check (is_member(conversation_id));

create policy mem_read on shared_memories for select using (is_member(conversation_id));
create policy mem_insert on shared_memories for insert with check (is_member(conversation_id) and author_id = auth.uid());
create policy mem_update on shared_memories for update using (is_member(conversation_id)) with check (is_member(conversation_id));
create policy mem_delete on shared_memories for delete using (is_member(conversation_id) and author_id = auth.uid());

-- Storage: private bucket, path = <conversation_id>/<owner_id>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-media','private-media', false, 104857600,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime','audio/webm','audio/mp4','audio/ogg'])
on conflict (id) do nothing;

create policy storage_read on storage.objects for select using (
  bucket_id = 'private-media' and is_member(((storage.foldername(name))[1])::uuid));
create policy storage_insert on storage.objects for insert with check (
  bucket_id = 'private-media' and is_member(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = auth.uid()::text);
create policy storage_delete on storage.objects for delete using (
  bucket_id = 'private-media' and (storage.foldername(name))[2] = auth.uid()::text);
