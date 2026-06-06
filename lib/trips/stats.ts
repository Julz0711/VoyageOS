import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { ExploreItem } from '@/models/ExploreItem';
import { PackingItem } from '@/models/PackingItem';
import { CalendarEntry } from '@/models/CalendarEntry';
import { TripDocument } from '@/models/Document';

export interface TripStats {
  exploreCount: number;
  plannedDays: number;
  packedCount: number;
  packingTotal: number;
  documentsCount: number;
}

export async function getTripStats(userId: string, tripId: string): Promise<TripStats> {
  await connectToDatabase();
  const [exploreCount, packingTotal, packedCount, plannedDates, documentsCount] = await Promise.all([
    ExploreItem.countDocuments({ userId, tripId }),
    PackingItem.countDocuments({ userId, tripId }),
    PackingItem.countDocuments({ userId, tripId, packed: true }),
    CalendarEntry.distinct('date', { userId, tripId }),
    TripDocument.countDocuments({ userId, tripId }),
  ]);

  return {
    exploreCount,
    packingTotal,
    packedCount,
    plannedDays: plannedDates.length,
    documentsCount,
  };
}
