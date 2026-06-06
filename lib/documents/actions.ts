'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { TripDocument, type DocumentKind } from '@/models/Document';
import { ExploreItem } from '@/models/ExploreItem';
import { buildStorageKey, putObject, deleteObject } from '@/lib/storage';
import {
  documentKindIds,
  isAllowedDocumentMime,
  MAX_DOCUMENT_BYTES,
  formatBytes,
} from '@/config/documents';

const uploadSchema = z.object({
  kind: z.enum(documentKindIds as [string, ...string[]]),
  linkedItemId: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export type UploadDocState = { error?: string; ok?: boolean } | undefined;

export async function uploadDocument(_prev: UploadDocState, formData: FormData): Promise<UploadDocState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file to upload' };
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { error: `File is too large (max ${formatBytes(MAX_DOCUMENT_BYTES)})` };
  }
  if (!isAllowedDocumentMime(file.type)) {
    return { error: 'Unsupported file type. Upload a PDF or an image.' };
  }

  const parsed = uploadSchema.safeParse({
    kind: formData.get('kind'),
    linkedItemId: formData.get('linkedItemId') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid upload' };

  await connectToDatabase();

  // Verify any linked item belongs to this user + trip (never trust a client-supplied id).
  let linkedItemId: string | undefined;
  if (parsed.data.linkedItemId && isValidObjectId(parsed.data.linkedItemId)) {
    const owned = await ExploreItem.exists({ _id: parsed.data.linkedItemId, userId, tripId: trip.id });
    if (owned) linkedItemId = parsed.data.linkedItemId;
  }

  const storageKey = buildStorageKey(userId, trip.id, file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await putObject(storageKey, bytes, file.type);

  await TripDocument.create({
    tripId: trip.id,
    userId,
    fileName: file.name.slice(0, 200),
    mimeType: file.type,
    sizeBytes: file.size,
    storageKey,
    kind: parsed.data.kind as DocumentKind,
    linkedItemId,
    notes: parsed.data.notes,
  });

  revalidatePath('/docs');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(documentId)) return;

  await connectToDatabase();
  const doc = await TripDocument.findOne({ _id: documentId, userId }).select('storageKey').lean();
  if (!doc) return;

  await deleteObject(doc.storageKey);
  await TripDocument.deleteOne({ _id: documentId, userId });

  revalidatePath('/docs');
  revalidatePath('/dashboard');
}
