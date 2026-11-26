export type GifCategory = 'Trending' | 'Love' | 'Hugs' | 'Kisses' | 'Cute' | 'Happy' | 'Dance';

export interface AnimatedGifItem {
  id: string;
  title: string;
  category: Exclude<GifCategory, 'Trending'>;
  url: string;
  tags: string[];
}

/**
 * Verified real animated .gif catalog served from GIPHY CDN
 * (HTTP 200, image/gif, cross-origin-resource-policy: cross-origin).
 */
export const ANIMATED_GIF_CATALOG: AnimatedGifItem[] = [
  {
    id: 'gif-love-1',
    title: 'Sending Love',
    category: 'Love',
    url: 'https://i.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif',
    tags: ['love', 'heart', 'romantic', 'us'],
  },
  {
    id: 'gif-hug-1',
    title: 'Warm Hug',
    category: 'Hugs',
    url: 'https://i.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif',
    tags: ['hug', 'warm', 'miss you', 'love'],
  },
  {
    id: 'gif-hug-2',
    title: 'Big Hug',
    category: 'Hugs',
    url: 'https://i.giphy.com/media/ZBQhoZC0nqknSviPqT/giphy.gif',
    tags: ['hug', 'squeeze', 'comfort', 'cute'],
  },
  {
    id: 'gif-kiss-1',
    title: 'Sweet Kiss',
    category: 'Kisses',
    url: 'https://i.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif',
    tags: ['kiss', 'romantic', 'love', 'muah'],
  },
  {
    id: 'gif-cute-1',
    title: 'Cute Kitty Love',
    category: 'Cute',
    url: 'https://i.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif',
    tags: ['cute', 'cat', 'kiss', 'aww'],
  },
  {
    id: 'gif-cute-2',
    title: 'Sweet Cuddle',
    category: 'Cute',
    url: 'https://i.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
    tags: ['cute', 'cuddle', 'blush', 'puppy'],
  },
  {
    id: 'gif-happy-1',
    title: 'So Happy',
    category: 'Happy',
    url: 'https://i.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif',
    tags: ['happy', 'smile', 'joy', 'yay'],
  },
  {
    id: 'gif-dance-1',
    title: 'Happy Dance',
    category: 'Dance',
    url: 'https://i.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    tags: ['dance', 'vibe', 'party', 'fun'],
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
      // Fallback to verified GIPHY CDN catalog
    }
  }

  const matches = ANIMATED_GIF_CATALOG.filter((g) => {
    const matchCat = category === 'Trending' || g.category === category;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.tags.some((t) => t.includes(q))
    );
  });

  return matches;
}
