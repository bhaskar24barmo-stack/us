import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase server env' }), { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const nowIso = new Date().toISOString();

  // 1. Deliver due scheduled messages
  const { data: dueMessages } = await admin
    .from('scheduled_messages')
    .select('*')
    .is('sent_at', null)
    .is('cancelled_at', null)
    .lte('send_at', nowIso)
    .limit(25);

  let deliveredCount = 0;
  for (const item of dueMessages ?? []) {
    const { error: insErr } = await admin.from('messages').insert({
      conversation_id: item.conversation_id,
      sender_id: item.sender_id,
      client_id: `sched-${item.id}`,
      kind: item.kind ?? 'love_note',
      body: item.body,
    });
    if (!insErr) {
      await admin
        .from('scheduled_messages')
        .update({ sent_at: nowIso })
        .eq('id', item.id);
      deliveredCount += 1;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, deliveredScheduledMessages: deliveredCount }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
