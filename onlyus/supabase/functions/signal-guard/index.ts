import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  ringing: new Set(['active', 'declined', 'missed', 'failed']),
  active: new Set(['ended', 'failed']),
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
  const uid = authData.user.id;
  const { data: approved } = await admin.from('approved_users').select('id').eq('user_id', uid).maybeSingle();
  if (!approved) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: ALLOWED_CORS });
  }

  const body = (await req.json()) as {
    action: 'start' | 'answer' | 'decline' | 'end' | 'miss' | 'ice_restart';
    conversationId?: string;
    calleeId?: string;
    kind?: 'voice' | 'video';
    callId?: string;
  };

  if (body.action === 'start' && body.conversationId && body.calleeId && body.kind) {
    if (body.calleeId === uid) {
      return new Response(JSON.stringify({ error: 'Cannot call yourself' }), { status: 400, headers: ALLOWED_CORS });
    }

    const { data: members } = await admin
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', body.conversationId);
    const memberIds = new Set((members ?? []).map((m) => m.user_id));
    if (!memberIds.has(uid) || !memberIds.has(body.calleeId)) {
      return new Response(JSON.stringify({ error: 'Both users must be members' }), { status: 403, headers: ALLOWED_CORS });
    }

    // Busy check: only one ringing/active call at a time
    const { data: existing } = await admin
      .from('calls')
      .select('id')
      .eq('conversation_id', body.conversationId)
      .in('status', ['ringing', 'active'])
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Busy: another call is active' }), { status: 409, headers: ALLOWED_CORS });
    }

    const { data, error } = await admin
      .from('calls')
      .insert({
        conversation_id: body.conversationId,
        caller_id: uid,
        callee_id: body.calleeId,
        kind: body.kind,
        status: 'ringing',
      })
      .select()
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: ALLOWED_CORS });
    return new Response(JSON.stringify({ call: data }), { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } });
  }

  if (!body.callId) {
    return new Response(JSON.stringify({ error: 'callId required' }), { status: 400, headers: ALLOWED_CORS });
  }

  const { data: currentCall } = await admin
    .from('calls')
    .select('*')
    .eq('id', body.callId)
    .or(`caller_id.eq.${uid},callee_id.eq.${uid}`)
    .maybeSingle();

  if (!currentCall) {
    return new Response(JSON.stringify({ error: 'Call not found' }), { status: 404, headers: ALLOWED_CORS });
  }

  if (body.action === 'ice_restart') {
    const { data, error } = await admin
      .from('calls')
      .update({ ice_restarts: (currentCall.ice_restarts ?? 0) + 1 })
      .eq('id', body.callId)
      .select()
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: ALLOWED_CORS });
    return new Response(JSON.stringify({ call: data }), { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } });
  }

  const nextStatus =
    body.action === 'answer'
      ? 'active'
      : body.action === 'decline'
      ? 'declined'
      : body.action === 'miss'
      ? 'missed'
      : 'ended';

  if (!VALID_TRANSITIONS[currentCall.status]?.has(nextStatus)) {
    return new Response(
      JSON.stringify({ error: `Invalid transition ${currentCall.status} -> ${nextStatus}` }),
      { status: 409, headers: ALLOWED_CORS }
    );
  }

  const nowIso = new Date().toISOString();
  const durationSeconds =
    nextStatus === 'ended' && currentCall.answered_at
      ? Math.max(1, Math.round((Date.now() - new Date(currentCall.answered_at).getTime()) / 1000))
      : 0;

  const patch =
    nextStatus === 'active'
      ? { status: 'active', answered_at: nowIso }
      : {
          status: nextStatus,
          ended_at: nowIso,
          end_reason: body.action,
          duration_seconds: durationSeconds,
        };

  const { data, error } = await admin
    .from('calls')
    .update(patch)
    .eq('id', body.callId)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: ALLOWED_CORS });
  return new Response(JSON.stringify({ call: data }), { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } });
});
