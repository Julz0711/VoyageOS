import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { Trip } from '@/models/Trip';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getExploreItems } from '@/lib/explore/queries';
import type { ExploreItemDTO, PlanEntryDTO } from '@/lib/dto';

export interface SharedTrip {
  name: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  baseLabel: string;
  entries: PlanEntryDTO[];
  items: ExploreItemDTO[];
}

/**
 * Loads a trip for the PUBLIC read-only share page by its share token. No auth, no user data:
 * returns only itinerary content (and never the token, owner id, or other trips).
 */
export async function getSharedTrip(token: string): Promise<SharedTrip | null> {
  if (!token || token.length < 8) return null;
  await connectToDatabase();
  const trip = await Trip.findOne({ shareToken: token })
    .select('name destination dateStart dateEnd baseLocation userId')
    .lean();
  if (!trip) return null;

  const userId = trip.userId.toString();
  const tripId = trip._id.toString();
  const [entries, items] = await Promise.all([
    getPlanEntries(userId, tripId),
    getExploreItems(userId, tripId),
  ]);

  return {
    name: trip.name,
    destination: trip.destination,
    dateStart: new Date(trip.dateStart).toISOString(),
    dateEnd: new Date(trip.dateEnd).toISOString(),
    baseLabel: trip.baseLocation.label,
    entries,
    items,
  };
}
