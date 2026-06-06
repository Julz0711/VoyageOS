import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ExploreItem } from '@/models/ExploreItem';
import { serializeDocs } from '@/lib/serialize';
import type { ExploreItemDTO } from '@/lib/dto';

/** All explore items for a trip, scoped to the session user. */
export async function getExploreItems(userId: string, tripId: string): Promise<ExploreItemDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await ExploreItem.find({ userId, tripId }).sort({ createdAt: 1 }).lean();
  return serializeDocs<ExploreItemDTO>(docs);
}
