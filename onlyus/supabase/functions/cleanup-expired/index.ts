import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase server env' }), { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  const { data: expiredMedia } = await admin
    .from('media_attachments')
    .select('id, storage_path')
    .lte('expires_at', nowIso)
    .is('deleted_at', null)
    .limit(100);

  if (expiredMedia && expiredMedia.length > 0) {
    const paths = expiredMedia.map((m) => m.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await admin.storage.from('private-media').remove(paths);
    }
    await admin
      .from('media_attachments')
      .update({ deleted_at: nowIso })
      .in('id', expiredMedia.map((m) => m.id));
  }

  const { data: expiredMsgs } = await admin
    .from('messages')
    .update({ deleted_at: nowIso, body: null })
    .lte('expires_at', nowIso)
    .is('deleted_at', null)
    .select('id');

  return new Response(
    JSON.stringify({
      purgedMessages: expiredMsgs?.length ?? 0,
      purgedMedia: expiredMedia?.length ?? 0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
