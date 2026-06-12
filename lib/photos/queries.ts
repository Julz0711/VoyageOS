import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { Photo } from '@/models/Photo';
import { serializeDocs } from '@/lib/serialize';
import type { PhotoDTO } from '@/lib/dto';

/** All photos for a trip (newest first), scoped to the session user. Never returns the key. */
export async function getPhotos(userId: string, tripId: string): Promise<PhotoDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await Photo.find({ userId, tripId })
    .select('-storageKey')
    .sort({ createdAt: -1 })
    .lean();
  return serializeDocs<PhotoDTO>(docs);
}
