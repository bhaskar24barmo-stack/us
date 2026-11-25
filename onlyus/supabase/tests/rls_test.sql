-- Run in the Supabase SQL editor AFTER both auth users exist. Everything rolls back.
begin;
do $$
declare
  a uuid; b uuid; cid uuid; stranger uuid := gen_random_uuid(); n int;
begin
  select user_id into a from approved_users where user_id is not null order by created_at limit 1;
  select user_id into b from approved_users where user_id is not null order by created_at offset 1 limit 1;
  select id into cid from conversations;
  if a is null or b is null or cid is null then raise exception 'Create both approved auth users first'; end if;

  -- 1. Approved user A can send as A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into messages (conversation_id, sender_id, client_id, body) values (cid, a, gen_random_uuid(), 'hello');

  -- 2. A cannot impersonate B
  begin
    insert into messages (conversation_id, sender_id, client_id, body) values (cid, b, gen_random_uuid(), 'fake');
    raise exception 'FAIL: impersonation was allowed';
  exception when sqlstate '42501' then null; end;

  -- 3. B can read A's message
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from messages;
  if n < 1 then raise exception 'FAIL: partner cannot read messages'; end if;

  -- 4. B cannot edit A's message
  update messages set body = 'tampered' where sender_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: partner edited another sender''s message'; end if;

  -- 5. A stranger sees nothing and cannot write
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select (select count(*) from messages) + (select count(*) from conversations) + (select count(*) from profiles)
       + (select count(*) from media_attachments) + (select count(*) from calls) + (select count(*) from shared_memories) into n;
  if n <> 0 then raise exception 'FAIL: stranger can read % rows', n; end if;
  begin
    insert into messages (conversation_id, sender_id, client_id, body) values (cid, stranger, gen_random_uuid(), 'x');
    raise exception 'FAIL: stranger inserted a message';
  exception when sqlstate '42501' then null; end;

  -- 6. A third approved user is rejected by the database
  reset role;
  begin
    insert into approved_users (email, display_name) values ('third@example.com', 'Third');
    raise exception 'FAIL: third approved user allowed';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  raise notice 'ALL RLS CHECKS PASSED';
end $$;
rollback;
