import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { getOptionalUserId } from '@/lib/auth/dal';
import { TripDocument } from '@/models/Document';
import { isRemoteStorage, getObjectBytes, getSignedDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Private document access. Every request is authenticated and ownership-checked; documents are
 * never public. R2 → redirect to a short-lived presigned URL; local → stream the bytes.
 * `?dl=1` forces a download (attachment) instead of inline preview.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getOptionalUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return new Response('Not found', { status: 404 });

  await connectToDatabase();
  const doc = await TripDocument.findOne({ _id: id, userId })
    .select('storageKey fileName mimeType')
    .lean();
  if (!doc) return new Response('Not found', { status: 404 });

  const download = new URL(req.url).searchParams.get('dl') === '1';

  if (isRemoteStorage()) {
    const url = await getSignedDownloadUrl(doc.storageKey, doc.fileName, { download });
    if (!url) return new Response('Not found', { status: 404 });
    return Response.redirect(url, 302);
  }

  const bytes = await getObjectBytes(doc.storageKey);
  if (!bytes) return new Response('Not found', { status: 404 });

  const disposition = `${download ? 'attachment' : 'inline'}; filename="${doc.fileName.replace(/"/g, '')}"`;
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, no-store',
    },
  });
}
