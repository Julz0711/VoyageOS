'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { ExploreItem } from '@/models/ExploreItem';
import { categories } from '@/config/categories';

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
