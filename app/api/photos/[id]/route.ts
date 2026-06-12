import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { getOptionalUserId } from '@/lib/auth/dal';
import { Photo } from '@/models/Photo';
import { isRemoteStorage, getObjectBytes, getSignedDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Private photo access. Authenticated + ownership-checked; photos are never public.
 * Remote storage → redirect to a short-lived presigned URL; local → stream the bytes.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOptionalUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return new Response('Not found', { status: 404 });

  await connectToDatabase();
  const photo = await Photo.findOne({ _id: id, userId })
    .select('storageKey fileName mimeType')
    .lean();
  if (!photo) return new Response('Not found', { status: 404 });

  const sp = new URL(req.url).searchParams;
  const download = sp.get('dl') === '1';
  // `inline=1` forces a same-origin byte stream (no cross-origin redirect) so the browser can
  // read the pixels for the recap PDF / canvas without CORS tainting.
  const forceStream = sp.get('inline') === '1';

  if (isRemoteStorage() && !forceStream) {
    const url = await getSignedDownloadUrl(photo.storageKey, photo.fileName, { download });
    if (!url) return new Response('Not found', { status: 404 });
    return Response.redirect(url, 302);
  }

  const bytes = await getObjectBytes(photo.storageKey);
  if (!bytes) return new Response('Not found', { status: 404 });

  const disposition = `${download ? 'attachment' : 'inline'}; filename="${photo.fileName.replace(/"/g, '')}"`;
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': photo.mimeType || 'application/octet-stream',
      'Content-Disposition': disposition,
      // Private but cacheable within the session — photos are immutable once uploaded.
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
