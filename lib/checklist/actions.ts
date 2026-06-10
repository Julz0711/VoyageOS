'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { ChecklistItem } from '@/models/ChecklistItem';

const addSchema = z.object({
  label: z.string().trim().min(1, 'Add a task').max(200),
  dueDate: z.union([z.coerce.date(), z.literal('')]).optional(),
});

export type AddChecklistState = { error?: string; ok?: boolean } | undefined;

export async function addChecklistItem(
  _prev: AddChecklistState,
  formData: FormData,
): Promise<AddChecklistState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = addSchema.safeParse({
    label: formData.get('label'),
    dueDate: formData.get('dueDate') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid task' };

  await connectToDatabase();
  const last = await ChecklistItem.findOne({ userId, tripId: trip.id }).sort({ order: -1 }).lean();
  await ChecklistItem.create({
    tripId: trip.id,
    userId,
    label: parsed.data.label,
    dueDate: parsed.data.dueDate instanceof Date ? parsed.data.dueDate : undefined,
    done: false,
    order: (last?.order ?? -1) + 1,
  });

  revalidatePath('/checklist');
  return { ok: true };
}

const updateSchema = z.object({
  label: z.string().trim().min(1, 'Add a task').max(200),
  dueDate: z.union([z.coerce.date(), z.literal('')]).optional(),
});

export type UpdateChecklistState = { error?: string; ok?: boolean } | undefined;

export async function updateChecklistItem(
  itemId: string,
  _prev: UpdateChecklistState,
  formData: FormData,
): Promise<UpdateChecklistState> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return { error: 'Invalid task' };

  const parsed = updateSchema.safeParse({
    label: formData.get('label'),
    dueDate: formData.get('dueDate') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid task' };

  await connectToDatabase();
  await ChecklistItem.updateOne(
    { _id: itemId, userId },
    parsed.data.dueDate instanceof Date
      ? { $set: { label: parsed.data.label, dueDate: parsed.data.dueDate } }
      : { $set: { label: parsed.data.label }, $unset: { dueDate: '' } },
  );

  revalidatePath('/checklist');
  return { ok: true };
}

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await ChecklistItem.updateOne({ _id: itemId, userId }, { $set: { done } });
  revalidatePath('/checklist');
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(itemId)) return;
  await connectToDatabase();
  await ChecklistItem.deleteOne({ _id: itemId, userId });
  revalidatePath('/checklist');
}
