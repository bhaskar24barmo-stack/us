import { supabase } from '@/lib/supabase';

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
]);

export const MAX_IMAGE_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const SIGNED_URL_TTL_SEC = 300; // 5 minutes max per Master Prompt

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export interface ValidatedUpload {
  ok: true;
  mimeType: string;
  sizeBytes: number;
}

export function validateMediaFile(
  file: Blob,
  mimeOverride?: string
): ValidatedUpload | { ok: false; error: string } {
  const mime = (mimeOverride || file.type || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
    return { ok: false, error: `Unsupported file type (${mime || 'unknown'}).` };
  }
  if (file.size <= 0) {
    return { ok: false, error: 'File is empty.' };
  }
  const maxBytes = mime.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_AUDIO_BYTES;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File exceeds the ${mime.startsWith('video/') ? '100 MB' : '25 MB'} upload limit.`,
    };
  }
  return { ok: true, mimeType: mime, sizeBytes: file.size };
}

export async function getSignedMediaUrl(storagePath: string): Promise<string | null> {
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now() + 15_000) {
    return cached.url;
  }
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from('private-media')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SEC * 1000,
  });
  return data.signedUrl;
}

export async function uploadPrivateMedia(params: {
  conversationId: string;
  ownerId: string;
  file: Blob;
  mimeOverride?: string;
  onProgress?: (pct: number) => void;
}): Promise<
  { storagePath: string; signedUrl: string; mimeType: string; sizeBytes: number } | { error: string }
> {
  const check = validateMediaFile(params.file, params.mimeOverride);
  if (!check.ok) return { error: check.error };
  if (!supabase) return { error: 'Supabase Storage is not configured.' };

  const ext = check.mimeType.split('/')[1]?.replace('quicktime', 'mov') || 'bin';
  const storagePath = `${params.conversationId}/${params.ownerId}/${crypto.randomUUID()}.${ext}`;

  params.onProgress?.(20);
  const { error: uploadErr } = await supabase.storage
    .from('private-media')
    .upload(storagePath, params.file, { contentType: check.mimeType, upsert: false });

  if (uploadErr) {
    return { error: uploadErr.message };
  }

  params.onProgress?.(85);
  const signedUrl = await getSignedMediaUrl(storagePath);
  if (!signedUrl) {
    return { error: 'Could not generate signed media URL.' };
  }

  params.onProgress?.(100);
  return {
    storagePath,
    signedUrl,
    mimeType: check.mimeType,
    sizeBytes: check.sizeBytes,
  };
}
