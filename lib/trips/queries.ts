import 'server-only';
import { cookies } from 'next/headers';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { Trip } from '@/models/Trip';
import { serializeDoc, serializeDocs } from '@/lib/serialize';
import type { TripDTO } from '@/lib/dto';

export const ACTIVE_TRIP_COOKIE = 'vos_active_trip';

/** All of a user's trips, soonest first. Always scoped to the session user. */
export async function getTrips(userId: string): Promise<TripDTO[]> {
  await connectToDatabase();
  const docs = await Trip.find({ userId }).sort({ dateStart: 1 }).lean();
  return serializeDocs<TripDTO>(docs);
}

/** A single trip, scoped to the user (returns null if not owned / not found). */
export async function getTripById(userId: string, tripId: string): Promise<TripDTO | null> {
  if (!isValidObjectId(tripId)) return null;
  await connectToDatabase();
  const doc = await Trip.findOne({ _id: tripId, userId }).lean();
  return doc ? serializeDoc<TripDTO>(doc) : null;
}

/**
 * Resolves the active trip: the one named in the cookie (if owned), otherwise the first trip.
 * Returns null only if the user has no trips.
 */
export async function getActiveTrip(userId: string): Promise<TripDTO | null> {
  const cookieStore = await cookies();
  const cookieTripId = cookieStore.get(ACTIVE_TRIP_COOKIE)?.value;

  if (cookieTripId) {
    const trip = await getTripById(userId, cookieTripId);
    if (trip) return trip;
  }

  const trips = await getTrips(userId);
  return trips[0] ?? null;
}
