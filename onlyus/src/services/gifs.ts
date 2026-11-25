export type GifCategory = 'All' | 'Love' | 'Hugs' | 'Kisses' | 'Cute' | 'Night';

export interface AnimatedGifItem {
  id: string;
  title: string;
  category: Exclude<GifCategory, 'All'>;
  url: string;
  tags: string[];
}

function makeAnimatedGif(
  bg1: string,
  bg2: string,
  emoji: string,
  caption: string,
  anim: 'pulse' | 'bounce' | 'float' | 'orbit' | 'shake',
  accent = '#ff4d8d'
): string {
  const animTag =
    anim === 'pulse'
      ? `<animateTransform attributeName="transform" type="scale" values="1;1.18;1;1.12;1" dur="1.3s" repeatCount="indefinite" additive="sum"/>`
      : anim === 'bounce'
      ? `<animateTransform attributeName="transform" type="translate" values="0 6;0 -12;0 6" dur="1.1s" repeatCount="indefinite"/>`
      : anim === 'shake'
      ? `<animateTransform attributeName="transform" type="rotate" values="-8;8;-8" dur="0.9s" repeatCount="indefinite"/>`
      : anim === 'orbit'
      ? `<animateTransform attributeName="transform" type="rotate" values="0;360" dur="5s" repeatCount="indefinite"/>`
      : `<animateTransform attributeName="transform" type="translate" values="0 4;0 -8;0 4" dur="2s" repeatCount="indefinite"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="aura" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="320" height="220" rx="24" fill="url(#bg)"/>
    <circle cx="160" cy="96" r="85" fill="url(#aura)">
      <animate attributeName="r" values="72;96;72" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="52" cy="48" r="3" fill="#fff" opacity="0.7">
      <animate attributeName="opacity" values="0.2;0.95;0.2" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="268" cy="64" r="2.5" fill="#fff" opacity="0.6">
      <animate attributeName="opacity" values="0.8;0.15;0.8" dur="1.9s" repeatCount="indefinite"/>
    </circle>
    <circle cx="248" cy="154" r="3.5" fill="${accent}" opacity="0.7">
      <animate attributeName="opacity" values="0.2;0.9;0.2" dur="1.4s" repeatCount="indefinite"/>
    </circle>
    <g transform="translate(160 96)">
      <g>
        ${animTag}
        <text x="0" y="6" font-size="64" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      </g>
    </g>
    <rect x="24" y="168" width="272" height="32" rx="16" fill="rgba(0,0,0,0.35)"/>
    <text x="160" y="188" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.4">${caption}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const ANIMATED_GIF_CATALOG: AnimatedGifItem[] = [
  {
    id: 'gif-1',
    title: 'Sending Big Hugs',
    category: 'Hugs',
    url: makeAnimatedGif('#2b0938', '#ff4d8d', '🫂', 'SENDING BIG HUGS', 'bounce', '#ff85b3'),
    tags: ['hug', 'warm', 'miss you', 'cuddle'],
  },
  {
    id: 'gif-2',
    title: 'Heartbeats Synced',
    category: 'Love',
    url: makeAnimatedGif('#16082c', '#7c3aed', '💓', 'HEARTBEATS SYNCED', 'pulse', '#ff4d8d'),
    tags: ['love', 'heart', 'heartbeat', 'us'],
  },
  {
    id: 'gif-3',
    title: 'Blowing Kisses',
    category: 'Kisses',
    url: makeAnimatedGif('#4a044e', '#ec4899', '😘', 'MUAAAH! KISSES', 'shake', '#f472b6'),
    tags: ['kiss', 'smooch', 'love', 'lips'],
  },
  {
    id: 'gif-4',
    title: 'Miss You So Much',
    category: 'Cute',
    url: makeAnimatedGif('#1e1b4b', '#db2777', '🥹', 'MISS YOU SO MUCH', 'float', '#c084fc'),
    tags: ['miss', 'cute', 'puppy eyes', 'please'],
  },
  {
    id: 'gif-5',
    title: 'Stargazing Night',
    category: 'Night',
    url: makeAnimatedGif('#09051a', '#4338ca', '🌙', 'GOODNIGHT MY LOVE', 'float', '#a78bfa'),
    tags: ['night', 'moon', 'sleep', 'stars'],
  },
  {
    id: 'gif-6',
    title: 'Lipstick Mark',
    category: 'Kisses',
    url: makeAnimatedGif('#4c0519', '#e11d48', '💋', 'ALL YOURS BABY', 'pulse', '#fb7185'),
    tags: ['kiss', 'lipstick', 'romantic', 'yours'],
  },
  {
    id: 'gif-7',
    title: 'Butterfly Feelings',
    category: 'Cute',
    url: makeAnimatedGif('#0f172a', '#8b5cf6', '🦋', 'STILL GIVE ME BUTTERFLIES', 'bounce', '#38bdf8'),
    tags: ['butterflies', 'crush', 'cute', 'happy'],
  },
  {
    id: 'gif-8',
    title: 'Forever & Always',
    category: 'Love',
    url: makeAnimatedGif('#1a062b', '#c026d3', '♾️', 'FOREVER & ALWAYS', 'orbit', '#f472b6'),
    tags: ['forever', 'infinity', 'love', 'couple'],
  },
  {
    id: 'gif-9',
    title: 'Cozy Movie Night',
    category: 'Night',
    url: makeAnimatedGif('#1f0a29', '#9333ea', '🍿', 'MOVIE NIGHT READY', 'bounce', '#fbbf24'),
    tags: ['movie', 'popcorn', 'date', 'night'],
  },
  {
    id: 'gif-10',
    title: 'Warm Cuddle Mood',
    category: 'Hugs',
    url: makeAnimatedGif('#3b0764', '#f43f5e', '🧸', 'CUDDLE TIME NOW', 'shake', '#fda4af'),
    tags: ['cuddle', 'bear', 'hug', 'cozy'],
  },
];

export async function searchAnimatedGifs(query: string, category: GifCategory): Promise<AnimatedGifItem[]> {
  const q = query.trim().toLowerCase();
  const tenorKey = import.meta.env.VITE_TENOR_API_KEY as string | undefined;

  if (tenorKey && q.length >= 2) {
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${encodeURIComponent(tenorKey)}&limit=12&media_filter=tinygif`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{ id: string; content_description?: string; media_formats?: { tinygif?: { url?: string } } }>;
        };
        const mapped: AnimatedGifItem[] = (data.results ?? [])
          .filter((r) => r.media_formats?.tinygif?.url)
          .map((r) => ({
            id: `tenor-${r.id}`,
            title: r.content_description || q,
            category: 'Love',
            url: r.media_formats!.tinygif!.url!,
            tags: [q],
          }));
        if (mapped.length > 0) return mapped;
      }
    } catch {
      // Fallback to built-in animated GIFs
    }
  }

  return ANIMATED_GIF_CATALOG.filter((g) => {
    const matchCat = category === 'All' || g.category === category;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q))
    );
  });
}
