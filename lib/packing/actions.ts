'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { PackingItem } from '@/models/PackingItem';

const addSchema = z.object({
  category: z.string().trim().min(1, 'Group is required').max(80),
  label: z.string().trim().min(1, 'Item is required').max(160),
  quantityHint: z.string().trim().max(80).optional(),
});

export type AddPackingState = { error?: string; ok?: boolean } | undefined;

export async function addPackingItem(
  _prev: AddPackingState,
  formData: FormData,
): Promise<AddPackingState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = addSchema.safeParse({
    category: formData.get('category'),
    label: formData.get('label'),
    quantityHint: formData.get('quantityHint') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid item' };

  await connectToDatabase();
  const last = await PackingItem.findOne({ userId, tripId: trip.id }).sort({ order: -1 }).lean();
  const order = (last?.order ?? -1) + 1;

  await PackingItem.create({
    tripId: trip.id,
    userId,
    category: parsed.data.category,
    label: parsed.data.label,
    quantityHint: parsed.data.quantityHint,
    packed: false,
    order,
  });

  revalidatePath('/pack');
  return { ok: true };
}

const updateSchema = z.object({
  category: z.string().trim().min(1).max(80).optional(),
  label: z.string().trim().min(1).max(160).optional(),
  quantityHint: z.string().trim().max(80).nullable().optional(),
});

export async function updatePackingItem(
  itemId: string,
  patch: { category?: string; label?: string; quantityHint?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return { ok: false, error: 'Invalid item' };

  const parsed = updateSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid edit' };

  const set: Record<string, unknown> = {};
  if (parsed.data.category !== undefined) set.category = parsed.data.category;
  if (parsed.data.label !== undefined) set.label = parsed.data.label;
  if (parsed.data.quantityHint !== undefined) set.quantityHint = parsed.data.quantityHint ?? undefined;
  if (Object.keys(set).length === 0) return { ok: true };

  await connectToDatabase();
  await PackingItem.updateOne({ _id: itemId, userId }, { $set: set });
  revalidatePath('/pack');
  return { ok: true };
}

export async function togglePacked(itemId: string, packed: boolean): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await PackingItem.updateOne({ _id: itemId, userId }, { $set: { packed } });
  revalidatePath('/pack');
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await PackingItem.deleteOne({ _id: itemId, userId });
  revalidatePath('/pack');
}

export async function resetPacking(): Promise<void> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return;
  await connectToDatabase();
  await PackingItem.updateMany({ userId, tripId: trip.id }, { $set: { packed: false } });
  revalidatePath('/pack');
}
