import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ChecklistItem } from '@/models/ChecklistItem';
import type { ChecklistItemDTO } from '@/lib/dto';

/** Checklist items for a trip, scoped to the session user. Sorted by due date then order. */
export async function getChecklist(userId: string, tripId: string): Promise<ChecklistItemDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await ChecklistItem.find({ userId, tripId }).sort({ order: 1, createdAt: 1 }).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    tripId: d.tripId.toString(),
    label: d.label,
    done: d.done,
    dueDate: d.dueDate ? new Date(d.dueDate).toISOString().slice(0, 10) : undefined,
    order: d.order,
  }));
}
