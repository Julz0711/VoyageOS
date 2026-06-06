import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { TripDocument } from '@/models/Document';
import { serializeDocs } from '@/lib/serialize';
import type { DocumentDTO } from '@/lib/dto';

/** All documents for a trip, scoped to the session user. Never returns the storage key. */
export async function getDocuments(userId: string, tripId: string): Promise<DocumentDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await TripDocument.find({ userId, tripId })
    .select('-storageKey')
    .sort({ createdAt: -1 })
    .lean();
  return serializeDocs<DocumentDTO>(docs);
}
