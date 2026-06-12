/** Photo upload constraints (mirrors config/documents but image-only). */

const ALLOWED_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

export const PHOTO_ACCEPT = 'image/*';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_PHOTO_MB = Math.round(MAX_PHOTO_BYTES / 1024 / 1024);

export function isAllowedPhotoMime(mime: string): boolean {
  return ALLOWED_PHOTO_MIME.has(mime) || mime.startsWith('image/');
}

/** Client-side pre-check so oversized/invalid files are caught before any upload. */
export function validatePhotoFile(file: File): string | null {
  if (!isAllowedPhotoMime(file.type)) return 'That’s not an image — upload a JPEG, PNG, WebP or HEIC.';
  if (file.size > MAX_PHOTO_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `This photo is ${mb} MB — the limit is ${MAX_PHOTO_MB} MB. Try a smaller version.`;
  }
  return null;
}
