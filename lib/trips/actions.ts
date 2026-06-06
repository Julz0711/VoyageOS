'use server';

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { geocode } from '@/lib/geocode/nominatim';
import { Trip } from '@/models/Trip';
import { ExploreItem } from '@/models/ExploreItem';
import { CalendarEntry } from '@/models/CalendarEntry';
import { PackingItem } from '@/models/PackingItem';
import { TripDocument } from '@/models/Document';
import { ChatThread } from '@/models/ChatThread';
import { Expense } from '@/models/Expense';
import { ChecklistItem } from '@/models/ChecklistItem';
import { ACTIVE_TRIP_COOKIE } from '@/lib/trips/queries';

const createTripSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    destination: z.string().trim().min(1, 'Destination is required').max(160),
    dateStart: z.coerce.date(),
    dateEnd: z.coerce.date(),
    baseLabel: z.string().trim().min(1, 'Base location label is required').max(160),
    baseLat: z.coerce.number().min(-90).max(90),
    baseLng: z.coerce.number().min(-180).max(180),
  })
  .refine((d) => d.dateEnd >= d.dateStart, {
    message: 'End date must be on or after the start date',
    path: ['dateEnd'],
  });

export type CreateTripState = { error?: string } | undefined;

export type LookupCoordsResult =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; error: string };

/**
 * Geocodes the trip's base from its label + destination so the user doesn't hand-enter
 * coordinates. Tries the specific "base, destination" first, then the destination alone.
 */
export async function lookupBaseCoordinates(input: {
  baseLabel?: string;
  destination?: string;
}): Promise<LookupCoordsResult> {
  await requireSession();
  const destination = input.destination?.trim();
  if (!destination) return { ok: false, error: 'Enter a destination first.' };

  const base = input.baseLabel?.trim();
  const queries = base ? [`${base}, ${destination}`, destination] : [destination];
  for (const q of queries) {
    const hit = await geocode(q);
    if (hit) return { ok: true, lat: hit.lat, lng: hit.lng, label: hit.label };
  }
  return { ok: false, error: 'Couldn’t find that location — enter coordinates manually.' };
}

async function setActiveTripCookie(tripId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TRIP_COOKIE, tripId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createTrip(
  _prev: CreateTripState,
  formData: FormData,
): Promise<CreateTripState> {
  const { userId } = await requireSession();

  const parsed = createTripSchema.safeParse({
    name: formData.get('name'),
    destination: formData.get('destination'),
    dateStart: formData.get('dateStart'),
    dateEnd: formData.get('dateEnd'),
    baseLabel: formData.get('baseLabel'),
    baseLat: formData.get('baseLat'),
    baseLng: formData.get('baseLng'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid trip details' };
  }

  await connectToDatabase();
  const trip = await Trip.create({
    userId,
    name: parsed.data.name,
    destination: parsed.data.destination,
    dateStart: parsed.data.dateStart,
    dateEnd: parsed.data.dateEnd,
    baseLocation: {
      lat: parsed.data.baseLat,
      lng: parsed.data.baseLng,
      label: parsed.data.baseLabel,
    },
    categories: [],
    archived: false,
  });

  await setActiveTripCookie(trip._id.toString());
  revalidatePath('/', 'layout');
  redirect('/explore');
}

/** Switches the active trip after verifying the user owns it. */
export async function setActiveTrip(tripId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(tripId)) return;

  await connectToDatabase();
  const owned = await Trip.exists({ _id: tripId, userId });
  if (!owned) return;

  await setActiveTripCookie(tripId);
  revalidatePath('/', 'layout');
}

/** Permanently deletes a trip and all its child records, scoped to the session user. */
export async function deleteTrip(tripId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(tripId)) return;

  await connectToDatabase();
  const owned = await Trip.exists({ _id: tripId, userId });
  if (!owned) return;

  // Cascade: remove all children, then the trip itself. All scoped to the user.
  await Promise.all([
    ExploreItem.deleteMany({ userId, tripId }),
    CalendarEntry.deleteMany({ userId, tripId }),
    PackingItem.deleteMany({ userId, tripId }),
    TripDocument.deleteMany({ userId, tripId }),
    ChatThread.deleteMany({ userId, tripId }),
    Expense.deleteMany({ userId, tripId }),
    ChecklistItem.deleteMany({ userId, tripId }),
  ]);
  await Trip.deleteOne({ _id: tripId, userId });

  // If the deleted trip was active, drop the cookie so we fall back to another trip.
  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_TRIP_COOKIE)?.value === tripId) {
    cookieStore.delete(ACTIVE_TRIP_COOKIE);
  }

  revalidatePath('/', 'layout');
}

/** Turns on read-only public sharing for the active trip, returning the share token. */
export async function enableSharing(): Promise<{ token: string } | { error: string }> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  await connectToDatabase();
  // Reuse an existing token if already shared (idempotent), else mint a new one.
  const existing = await Trip.findOne({ _id: trip.id, userId }).select('shareToken').lean();
  const token = existing?.shareToken ?? randomBytes(16).toString('hex');
  await Trip.updateOne({ _id: trip.id, userId }, { $set: { shareToken: token } });

  revalidatePath('/plan');
  return { token };
}

export async function disableSharing(): Promise<void> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return;
  await connectToDatabase();
  await Trip.updateOne({ _id: trip.id, userId }, { $unset: { shareToken: '' } });
  revalidatePath('/plan');
}

export async function setTripArchived(tripId: string, archived: boolean): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(tripId)) return;

  await connectToDatabase();
  await Trip.updateOne({ _id: tripId, userId }, { $set: { archived } });
  revalidatePath('/', 'layout');
}
