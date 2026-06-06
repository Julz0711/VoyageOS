'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { ExploreItem } from '@/models/ExploreItem';
import { categories } from '@/config/categories';
import { geocode } from '@/lib/geocode/nominatim';

const bandValues = ['doorstep', '≤15', '≤45', 'daytrip'] as const;
const weatherValues = ['fine', 'any', 'wet'] as const;

const addItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  category: z.string().refine((id) => id in categories, 'Unknown category'),
  subtitle: z.string().trim().max(280).optional(),
  band: z.enum(bandValues).optional(),
  minutes: z.coerce.number().int().min(0).max(100000).optional(),
  weatherFit: z.array(z.enum(weatherValues)).default(['any']),
  tags: z.string().optional(),
  dontMiss: z.boolean().default(false),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export type AddItemState = { error?: string; ok?: boolean } | undefined;

export async function addExploreItem(_prev: AddItemState, formData: FormData): Promise<AddItemState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const weatherFit = formData.getAll('weatherFit').map(String);
  const parsed = addItemSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    subtitle: formData.get('subtitle') || undefined,
    band: formData.get('band') || undefined,
    minutes: formData.get('minutes') || undefined,
    weatherFit: weatherFit.length ? weatherFit : undefined,
    tags: formData.get('tags') || undefined,
    dontMiss: formData.get('dontMiss') === 'on',
    lat: formData.get('lat') || undefined,
    lng: formData.get('lng') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid item' };
  }
  const d = parsed.data;

  await connectToDatabase();
  await ExploreItem.create({
    tripId: trip.id,
    userId,
    title: d.title,
    category: d.category,
    subtitle: d.subtitle,
    distanceFromBase: d.band ? { band: d.band, minutes: d.minutes } : undefined,
    location: d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : undefined,
    tags: d.tags ? d.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    weatherFit: d.weatherFit,
    dontMiss: d.dontMiss,
    source: 'manual',
  });

  revalidatePath('/explore');
  revalidatePath('/map');
  return { ok: true };
}

const editItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(160),
  category: z.string().refine((id) => id in categories, 'Unknown category'),
  subtitle: z.string().trim().max(280).optional(),
  description: z.string().trim().max(2000).optional(),
  band: z.union([z.enum(bandValues), z.literal('')]).optional(),
  minutes: z.union([z.coerce.number().int().min(0).max(100000), z.literal('')]).optional(),
  weatherFit: z.array(z.enum(weatherValues)).default(['any']),
  tags: z.string().optional(),
  dontMiss: z.boolean().default(false),
  areaLabel: z.string().trim().max(160).optional(),
  lat: z.union([z.coerce.number().min(-90).max(90), z.literal('')]).optional(),
  lng: z.union([z.coerce.number().min(-180).max(180), z.literal('')]).optional(),
});

export type EditItemState = { error?: string; ok?: boolean } | undefined;

/** User-driven edit of an Explore item (fix the location, add notes, retag, etc.). */
export async function updateExploreItemFields(
  itemId: string,
  _prev: EditItemState,
  formData: FormData,
): Promise<EditItemState> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return { error: 'Invalid item' };

  const weatherFit = formData.getAll('weatherFit').map(String);
  const parsed = editItemSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category'),
    subtitle: formData.get('subtitle') || undefined,
    description: formData.get('description') || undefined,
    band: formData.get('band') ?? '',
    minutes: formData.get('minutes') ?? '',
    weatherFit: weatherFit.length ? weatherFit : undefined,
    tags: formData.get('tags') || undefined,
    dontMiss: formData.get('dontMiss') === 'on',
    areaLabel: formData.get('areaLabel') || undefined,
    lat: formData.get('lat') ?? '',
    lng: formData.get('lng') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid item' };
  const d = parsed.data;

  const hasCoords = d.lat !== '' && d.lat != null && d.lng !== '' && d.lng != null;
  const set: Record<string, unknown> = {
    title: d.title,
    category: d.category,
    subtitle: d.subtitle,
    description: d.description,
    weatherFit: d.weatherFit,
    dontMiss: d.dontMiss,
    tags: d.tags ? d.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    distanceFromBase: d.band
      ? { band: d.band, minutes: d.minutes === '' ? undefined : d.minutes }
      : undefined,
    location: hasCoords
      ? { lat: d.lat as number, lng: d.lng as number, areaLabel: d.areaLabel }
      : undefined,
  };

  await connectToDatabase();
  const res = await ExploreItem.updateOne({ _id: itemId, userId }, { $set: set });
  if (res.matchedCount === 0) return { error: 'Item not found' };

  revalidatePath('/explore');
  revalidatePath('/map');
  return { ok: true };
}

/** Geocode a free-text place to fix an item's coordinates. */
export async function geocodePlace(
  query: string,
): Promise<{ ok: true; lat: number; lng: number; label: string } | { ok: false; error: string }> {
  await requireSession();
  const hit = await geocode(query);
  return hit
    ? { ok: true, lat: hit.lat, lng: hit.lng, label: hit.label }
    : { ok: false, error: 'No match — enter coordinates manually.' };
}

export async function toggleFavorite(itemId: string, isFavorite: boolean): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await ExploreItem.updateOne({ _id: itemId, userId }, { $set: { isFavorite } });
  revalidatePath('/explore');
  revalidatePath('/map');
}

export async function deleteExploreItem(itemId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await ExploreItem.deleteOne({ _id: itemId, userId });
  revalidatePath('/explore');
  revalidatePath('/map');
}
