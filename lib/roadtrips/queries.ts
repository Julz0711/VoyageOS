import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { Roadtrip } from '@/models/Roadtrip';
import { ExploreItem } from '@/models/ExploreItem';
import type { RoadtripDTO, RoadtripStopDTO } from '@/lib/dto';

/** Roadtrips for a trip with their stops resolved (title/category/location), in route order. */
export async function getRoadtrips(userId: string, tripId: string): Promise<RoadtripDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();

  const roadtrips = await Roadtrip.find({ userId, tripId }).sort({ createdAt: -1 }).lean();
  if (roadtrips.length === 0) return [];

  // Resolve every referenced stop in one query.
  const allIds = [...new Set(roadtrips.flatMap((r) => r.stopIds.map((id) => id.toString())))];
  const items = await ExploreItem.find({ _id: { $in: allIds }, userId, tripId })
    .select('title category location')
    .lean();
  const byId = new Map<string, RoadtripStopDTO>(
    items.map((i) => [
      i._id.toString(),
      {
        id: i._id.toString(),
        title: i.title,
        category: i.category,
        lat: i.location?.lat,
        lng: i.location?.lng,
        areaLabel: i.location?.areaLabel,
      },
    ]),
  );

  return roadtrips.map((r) => ({
    id: r._id.toString(),
    tripId: r.tripId.toString(),
    name: r.name,
    notes: r.notes,
    exploreItemId: r.exploreItemId?.toString(),
    stops: r.stopIds.map((id) => byId.get(id.toString())).filter((s): s is RoadtripStopDTO => Boolean(s)),
  }));
}
