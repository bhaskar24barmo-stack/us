import { createHmac } from 'node:crypto';

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export default function handler(
  req: { query?: Record<string, string | string[] | undefined>; body?: Record<string, unknown> },
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return res.status(500).json({ error: 'LiveKit environment variables not configured' });
  }

  const roomRaw = req.query?.room ?? req.body?.room ?? 'onlyus-private-room';
  const identityRaw = req.query?.identity ?? req.body?.identity ?? `user-${Date.now()}`;
  const room = Array.isArray(roomRaw) ? roomRaw[0] : String(roomRaw);
  const identity = Array.isArray(identityRaw) ? identityRaw[0] : String(identityRaw);

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: apiKey,
      sub: identity,
      iat: now,
      nbf: now,
      exp: now + 3600,
      video: {
        room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    })
  );
  const signature = base64url(createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest());
  const token = `${header}.${payload}.${signature}`;

  return res.status(200).json({ token, url: wsUrl, room, identity });
}
