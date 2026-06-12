'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { Photo } from '@/models/Photo';
import { ExploreItem } from '@/models/ExploreItem';
import { buildStorageKey, putObject, deleteObject } from '@/lib/storage';
import { isAllowedPhotoMime, MAX_PHOTO_BYTES } from '@/config/photos';

const tagsSchema = z.object({
  caption: z.string().trim().max(280).optional(),
  linkedItemId: z.string().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export type PhotoState = { error?: string; ok?: boolean } | undefined;

/** Verify a linked place belongs to this user + trip (never trust a client id). */
async function ownedLinkedItem(
  userId: string,
  tripId: string,
  id?: string,
): Promise<string | undefined> {
  if (!id || !isValidObjectId(id)) return undefined;
  const owned = await ExploreItem.exists({ _id: id, userId, tripId });
  return owned ? id : undefined;
}

export async function uploadPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a photo to upload' };
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: `Photo is too large (max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB)` };
  }
  if (!isAllowedPhotoMime(file.type)) return { error: 'Upload an image (JPEG, PNG, WebP, HEIC…).' };

  const parsed = tagsSchema.safeParse({
    caption: formData.get('caption') || undefined,
    linkedItemId: formData.get('linkedItemId') || undefined,
    day: formData.get('day') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid tags' };

  await connectToDatabase();
  const linkedItemId = await ownedLinkedItem(userId, trip.id, parsed.data.linkedItemId);

  const storageKey = buildStorageKey(userId, trip.id, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await putObject(storageKey, bytes, file.type);

  await Photo.create({
    tripId: trip.id,
    userId,
    fileName: file.name.slice(0, 200),
    mimeType: file.type,
    sizeBytes: file.size,
    storageKey,
    caption: parsed.data.caption,
    linkedItemId,
    day: parsed.data.day || undefined,
  });

  revalidatePath('/photos');
  return { ok: true };
}

export async function updatePhoto(
  photoId: string,
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };
  if (!isValidObjectId(photoId)) return { error: 'Invalid photo' };

  const parsed = tagsSchema.safeParse({
    caption: formData.get('caption') || undefined,
    linkedItemId: formData.get('linkedItemId') || undefined,
    day: formData.get('day') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid tags' };

  await connectToDatabase();
  const linkedItemId = await ownedLinkedItem(userId, trip.id, parsed.data.linkedItemId);

  const set: Record<string, unknown> = {};
  const unset: Record<string, string> = {};
  if (parsed.data.caption) set.caption = parsed.data.caption;
  else unset.caption = '';
  if (linkedItemId) set.linkedItemId = linkedItemId;
  else unset.linkedItemId = '';
  if (parsed.data.day) set.day = parsed.data.day;
  else unset.day = '';

  await Photo.updateOne(
    { _id: photoId, userId },
    {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    },
  );

  revalidatePath('/photos');
  return { ok: true };
}

export async function deletePhoto(photoId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(photoId)) return;

  await connectToDatabase();
  const photo = await Photo.findOne({ _id: photoId, userId }).select('storageKey').lean();
  if (!photo) return;

  await deleteObject(photo.storageKey);
  await Photo.deleteOne({ _id: photoId, userId });

  revalidatePath('/photos');
}
