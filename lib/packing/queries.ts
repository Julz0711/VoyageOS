import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { PackingItem } from '@/models/PackingItem';
import { serializeDocs } from '@/lib/serialize';
import type { PackingItemDTO } from '@/lib/dto';

export async function getPackingItems(userId: string, tripId: string): Promise<PackingItemDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await PackingItem.find({ userId, tripId }).sort({ order: 1, createdAt: 1 }).lean();
  return serializeDocs<PackingItemDTO>(docs);
}
