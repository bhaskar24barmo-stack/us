export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

function loadBitmap(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function compressImage(
  file: Blob,
  maxLongEdge = 2048,
  quality = 0.82
): Promise<CompressedImage> {
  const img = await loadBitmap(file);
  const scale = Math.min(1, maxLongEdge / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = 'image/webp';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else {
          canvas.toBlob(
            (jb) => (jb ? resolve(jb) : reject(new Error('Compression failed'))),
            'image/jpeg',
            quality
          );
        }
      },
      mimeType,
      quality
    );
  });

  return { blob, width, height, mimeType: blob.type || mimeType };
}

export async function createImageThumbnail(file: Blob, maxEdge = 400): Promise<Blob> {
  const res = await compressImage(file, maxEdge, 0.75);
  return res.blob;
}

export async function createVideoPoster(file: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 4);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 400 / Math.max(video.videoWidth || 400, video.videoHeight || 400));
      canvas.width = Math.max(1, Math.round((video.videoWidth || 400) * scale));
      canvas.height = Math.max(1, Math.round((video.videoHeight || 400) * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => {
          cleanup();
          resolve(b);
        },
        'image/jpeg',
        0.75
      );
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}
