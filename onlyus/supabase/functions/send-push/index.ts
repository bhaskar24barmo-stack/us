import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ALLOWED_CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: ALLOWED_CORS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase server env' }), { status: 500, headers: ALLOWED_CORS });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authErr } = await userClient.auth.getUser();
  if (authErr || !authData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: ALLOWED_CORS });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: approved } = await admin
    .from('approved_users')
    .select('id')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (!approved) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: ALLOWED_CORS });
  }

  const { recipientId, kind = 'message', title = 'ONLYUS', body = 'New private activity' } = (await req.json()) as {
    recipientId: string;
    kind?: string;
    title?: string;
    body?: string;
  };

  if (!recipientId) {
    return new Response(JSON.stringify({ error: 'recipientId required' }), { status: 400, headers: ALLOWED_CORS });
  }

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('hide_previews, muted_until')
    .eq('user_id', recipientId)
    .maybeSingle();

  if (prefs?.muted_until && new Date(prefs.muted_until).getTime() > Date.now()) {
    return new Response(JSON.stringify({ skipped: 'muted' }), { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } });
  }

  const safeBody = prefs?.hide_previews ? 'New private activity' : body.slice(0, 200);
  await admin.from('notifications').insert({
    user_id: recipientId,
    kind,
    title: title.slice(0, 120),
    body: safeBody,
    action_route: kind === 'incoming_call' || kind === 'missed_call' ? '/calls' : '/chats',
  });

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', recipientId)
    .is('expired_at', null);

  return new Response(
    JSON.stringify({
      inAppRecorded: true,
      activePushSubscriptions: subs?.length ?? 0,
      vapidConfigured: Boolean(Deno.env.get('VAPID_PUBLIC_KEY') && Deno.env.get('VAPID_PRIVATE_KEY')),
    }),
    { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } }
  );
});
