import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ALLOWED_CORS });
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

  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // Time-limited HMAC TURN credentials (TTL 3600s)
  const turnUrls = Deno.env.get('TURN_URLS');
  const turnSecret = Deno.env.get('TURN_SHARED_SECRET');
  let turnConfigured = false;

  if (turnUrls && turnSecret) {
    const ttl = 3600;
    const expiry = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiry}:${authData.user.id}`;
    const credential = await hmacSha1Base64(turnSecret, username);
    const urls = turnUrls.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length > 0) {
      iceServers.push({ urls, username, credential });
      turnConfigured = true;
    }
  } else {
    const turnUrl = Deno.env.get('TURN_URL');
    const turnUser = Deno.env.get('TURN_USERNAME');
    const turnCred = Deno.env.get('TURN_CREDENTIAL');
    if (turnUrl && turnUser && turnCred) {
      iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
      turnConfigured = true;
    }
  }

  return new Response(
    JSON.stringify({ iceServers, turnConfigured, ttlSeconds: 3600 }),
    { headers: { ...ALLOWED_CORS, 'Content-Type': 'application/json' } }
  );
});
