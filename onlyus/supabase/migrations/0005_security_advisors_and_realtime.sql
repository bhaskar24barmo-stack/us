-- Phase 4/5 Security Advisor Fixes + Realtime Publication Setup

-- 1. Pin search_path on trigger helper functions
alter function public.set_updated_at() set search_path = public;
alter function public.enforce_two_approved() set search_path = public;
alter function public.enforce_two_members() set search_path = public;

-- 2. Revoke public/anon EXECUTE on SECURITY DEFINER functions
revoke all on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

revoke all on function public.toggle_message_pin(uuid) from public, anon;
grant execute on function public.toggle_message_pin(uuid) to authenticated;

revoke all on function public.is_device_active(uuid) from public, anon;
grant execute on function public.is_device_active(uuid) to authenticated;

revoke all on function public.is_approved() from public, anon;
grant execute on function public.is_approved() to authenticated;

revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- Trigger functions should not be directly callable via PostgREST RPC
revoke all on function public.gate_auth_signup() from public, anon, authenticated;
revoke all on function public.guard_message_update() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 3. Ensure Supabase Realtime publication includes core live tables
do $$
declare tbl text;
begin
  foreach tbl in array array['messages','message_reactions','user_devices','user_presence','calls','shared_notes','notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
