'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { Roadtrip } from '@/models/Roadtrip';
import { ExploreItem } from '@/models/ExploreItem';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name your roadtrip').max(160),
  notes: z.string().trim().max(2000).optional(),
  stopIds: z.array(z.string()).min(2, 'Pick at least two stops'),
});

export type CreateRoadtripResult = { ok: true; id: string } | { ok: false; error: string };

export async function createRoadtrip(input: {
  name: string;
  notes?: string;
  stopIds: string[];
}): Promise<CreateRoadtripResult> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { ok: false, error: 'No active trip' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid roadtrip' };

  const ids = parsed.data.stopIds.filter((id) => isValidObjectId(id));
  if (ids.length < 2) return { ok: false, error: 'Pick at least two stops' };

  await connectToDatabase();

  // Verify every stop belongs to this user + trip, and keep the requested order.
  const owned = await ExploreItem.find({ _id: { $in: ids }, userId, tripId: trip.id })
    .select('title location')
    .lean();
  const ownedById = new Map(owned.map((i) => [i._id.toString(), i]));
  const orderedStops = ids.map((id) => ownedById.get(id)).filter((i): i is NonNullable<typeof i> => Boolean(i));
  if (orderedStops.length < 2) return { ok: false, error: 'Some stops were not found' };

  const firstWithLoc = orderedStops.find((s) => s.location?.lat != null && s.location?.lng != null);

  // Mirror Explore card (category 'road-trip') so the roadtrip shows in Explore too.
  const mirror = await ExploreItem.create({
    tripId: trip.id,
    userId,
    title: parsed.data.name,
    category: 'road-trip',
    subtitle: `Roadtrip · ${orderedStops.length} stops`,
    description: parsed.data.notes,
    location: firstWithLoc?.location
      ? {
          lat: firstWithLoc.location.lat,
          lng: firstWithLoc.location.lng,
          areaLabel: firstWithLoc.location.areaLabel,
        }
      : undefined,
    distanceFromBase: { band: 'daytrip' },
    tags: ['roadtrip'],
    weatherFit: ['any'],
    source: 'manual',
    routeStopIds: orderedStops.map((s) => s._id),
  });

  const roadtrip = await Roadtrip.create({
    tripId: trip.id,
    userId,
    name: parsed.data.name,
    notes: parsed.data.notes,
    stopIds: orderedStops.map((s) => s._id),
    exploreItemId: mirror._id,
  });

  revalidatePath('/roadtrips');
  revalidatePath('/explore');
  revalidatePath('/map');
  return { ok: true, id: roadtrip._id.toString() };
}

export async function deleteRoadtrip(roadtripId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(roadtripId)) return;

  await connectToDatabase();
  const rt = await Roadtrip.findOne({ _id: roadtripId, userId }).select('exploreItemId').lean();
  if (!rt) return;

  if (rt.exploreItemId) {
    await ExploreItem.deleteOne({ _id: rt.exploreItemId, userId });
  }
  await Roadtrip.deleteOne({ _id: roadtripId, userId });

  revalidatePath('/roadtrips');
  revalidatePath('/explore');
  revalidatePath('/map');
}
