export type GifCategory = 'Trending' | 'Love' | 'Hugs' | 'Kisses' | 'Cute' | 'Happy' | 'Dance';

export interface AnimatedGifItem {
  id: string;
  title: string;
  category: Exclude<GifCategory, 'Trending'>;
  url: string;
  tags: string[];
}

/**
 * Verified real animated .gif catalog (zero fake SVG cards) so the GIF keyboard
 * renders real auto-playing GIFs immediately even offline or before live fetch completes.
 */
export const ANIMATED_GIF_CATALOG: AnimatedGifItem[] = [
  {
    id: 'gif-hug-1',
    title: 'Warm Hug',
    category: 'Hugs',
    url: 'https://nekos.best/api/v2/hug/b1136a84-2653-4c87-b80f-ea3cc0bf6ab9.gif',
    tags: ['hug', 'warm', 'miss you', 'love'],
  },
  {
    id: 'gif-hug-2',
    title: 'Tight Squeeze',
    category: 'Hugs',
    url: 'https://nekos.best/api/v2/hug/85e51199-6829-4ffd-85e3-4d1a1b9ba891.gif',
    tags: ['hug', 'squeeze', 'comfort', 'cute'],
  },
  {
    id: 'gif-cuddle-1',
    title: 'Cozy Cuddle',
    category: 'Love',
    url: 'https://nekos.best/api/v2/cuddle/53f8e7d6-52c0-4fa3-aebb-6d8e26e99f33.gif',
    tags: ['cuddle', 'love', 'cozy', 'us'],
  },
  {
    id: 'gif-cuddle-2',
    title: 'Holding Close',
    category: 'Love',
    url: 'https://nekos.best/api/v2/cuddle/08bb608a-b01b-488c-97ef-b4ee94dab37b.gif',
    tags: ['cuddle', 'love', 'hold', 'romantic'],
  },
  {
    id: 'gif-kiss-1',
    title: 'Sweet Kiss',
    category: 'Kisses',
    url: 'https://nekos.best/api/v2/kiss/5a0e8e01-8992-4b7a-91ed-2bbf3ac7e5b9.gif',
    tags: ['kiss', 'romantic', 'love', 'muah'],
  },
  {
    id: 'gif-kiss-2',
    title: 'Midnight Kiss',
    category: 'Kisses',
    url: 'https://nekos.best/api/v2/kiss/3385ca97-b64b-4798-a4c4-292a7eb5a15e.gif',
    tags: ['kiss', 'night', 'love', 'couple'],
  },
  {
    id: 'gif-kiss-3',
    title: 'Soft Kiss',
    category: 'Kisses',
    url: 'https://cdn.otakugifs.xyz/gifs/kiss/cc21567435858305.gif',
    tags: ['kiss', 'cute', 'affection'],
  },
];

const CATEGORY_ENDPOINT: Record<GifCategory, string> = {
  Trending: 'hug',
  Love: 'cuddle',
  Hugs: 'hug',
  Kisses: 'kiss',
  Cute: 'blush',
  Happy: 'happy',
  Dance: 'dance',
};

const KEYWORD_TO_ENDPOINT: Array<[RegExp, string]> = [
  [/kiss|muah|smooch|lips/, 'kiss'],
  [/hug|miss|comfort|hold/, 'hug'],
  [/cuddle|love|heart|romantic|night|sleep/, 'cuddle'],
  [/blush|shy|cute|aww/, 'blush'],
  [/happy|yay|smile|excited|joy/, 'happy'],
  [/dance|party|vibe|celebrate/, 'dance'],
  [/pat|headpat|aww/, 'pat'],
  [/wink|flirt|hey/, 'wink'],
  [/wave|hi|hello|morning/, 'wave'],
];

const gifCache = new Map<string, AnimatedGifItem[]>();

function resolveEndpoint(query: string, category: GifCategory): string {
  const q = query.trim().toLowerCase();
  if (q) {
    for (const [pattern, ep] of KEYWORD_TO_ENDPOINT) {
      if (pattern.test(q)) return ep;
    }
  }
  return CATEGORY_ENDPOINT[category] ?? 'hug';
}

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
      // Fallback to live public GIF endpoint
    }
  }

  const endpoint = resolveEndpoint(q, category);
  const cacheKey = `${endpoint}:${category}:${q}`;
  const cached = gifCache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`https://nekos.best/api/v2/${encodeURIComponent(endpoint)}?amount=8`);
    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{ anime_name?: string; url: string }>;
      };
      const catLabel: Exclude<GifCategory, 'Trending'> =
        category === 'Trending' ? 'Love' : category;
      const items: AnimatedGifItem[] = (data.results ?? [])
        .filter((r) => Boolean(r.url))
        .map((r, idx) => ({
          id: `live-${endpoint}-${idx}-${r.url.slice(-10)}`,
          title: r.anime_name || `${endpoint} GIF`,
          category: catLabel,
          url: r.url,
          tags: [endpoint, q].filter(Boolean),
        }));
      if (items.length > 0) {
        gifCache.set(cacheKey, items);
        return items;
      }
    }
  } catch {
    // Offline fallback to verified real .gif catalog
  }

  return ANIMATED_GIF_CATALOG.filter((g) => {
    const matchCat = category === 'Trending' || g.category === category;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q))
    );
  });
}
