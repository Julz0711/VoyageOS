import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { CalendarEntry } from '@/models/CalendarEntry';
import { ExploreItem } from '@/models/ExploreItem';
import type { PlanEntryDTO } from '@/lib/dto';

/** Calendar entries for a trip, enriched with each linked Explore item's display fields. */
export async function getPlanEntries(userId: string, tripId: string): Promise<PlanEntryDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();

  const entries = await CalendarEntry.find({ userId, tripId })
    .sort({ date: 1, startTime: 1, order: 1 })
    .lean();

  const itemIds = entries
    .map((e) => e.exploreItemId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  const items = itemIds.length
    ? await ExploreItem.find({ _id: { $in: itemIds }, userId }).lean()
    : [];
  const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

  return entries.map((e) => {
    const item = e.exploreItemId ? itemMap.get(e.exploreItemId.toString()) : undefined;
    return {
      id: e._id.toString(),
      tripId: e.tripId.toString(),
      date: new Date(e.date).toISOString().slice(0, 10),
      startTime: e.startTime,
      durationMinutes: e.durationMinutes,
      note: e.note,
      order: e.order,
      exploreItemId: e.exploreItemId?.toString(),
      title: item?.title ?? e.note ?? 'Untitled',
      category: item?.category,
      areaLabel: item?.location?.areaLabel,
    };
  });
}
