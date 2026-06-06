'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { CalendarEntry } from '@/models/CalendarEntry';
import { ExploreItem } from '@/models/ExploreItem';

const addSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
    exploreItemId: z.string().optional(),
    note: z.string().trim().max(280).optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    durationMinutes: z.number().int().min(0).max(1440).optional(),
  })
  .refine((d) => d.exploreItemId || d.note, {
    message: 'Pick an item or add a note',
  });

export type AddToCalendarInput = z.input<typeof addSchema>;
export type CalendarActionResult = { error?: string; ok?: boolean };

export async function addToCalendar(input: AddToCalendarInput): Promise<CalendarActionResult> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid entry' };
  const d = parsed.data;

  await connectToDatabase();

  // If linked to an explore item, verify ownership + trip scope.
  if (d.exploreItemId) {
    if (!isValidObjectId(d.exploreItemId)) return { error: 'Invalid item' };
    const owned = await ExploreItem.exists({ _id: d.exploreItemId, userId, tripId: trip.id });
    if (!owned) return { error: 'Item not found' };
  }

  const date = new Date(`${d.date}T00:00:00.000Z`);
  const last = await CalendarEntry.findOne({ userId, tripId: trip.id, date }).sort({ order: -1 }).lean();
  const order = (last?.order ?? -1) + 1;

  await CalendarEntry.create({
    tripId: trip.id,
    userId,
    exploreItemId: d.exploreItemId,
    date,
    startTime: d.startTime,
    durationMinutes: d.durationMinutes,
    note: d.exploreItemId ? undefined : d.note,
    order,
  });

  revalidatePath('/plan');
  return { ok: true };
}

export async function clearPlan(): Promise<void> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return;
  await connectToDatabase();
  await CalendarEntry.deleteMany({ userId, tripId: trip.id });
  revalidatePath('/plan');
}

export async function removeCalendarEntry(entryId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(entryId)) return;
  await connectToDatabase();
  await CalendarEntry.deleteOne({ _id: entryId, userId });
  revalidatePath('/plan');
}

/** Moves an entry up/down within its day by swapping order with the adjacent entry. */
export async function moveCalendarEntry(entryId: string, direction: 'up' | 'down'): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(entryId)) return;
  await connectToDatabase();

  const entry = await CalendarEntry.findOne({ _id: entryId, userId });
  if (!entry) return;

  const siblings = await CalendarEntry.find({ userId, tripId: entry.tripId, date: entry.date }).sort({
    order: 1,
  });
  const index = siblings.findIndex((s) => s._id.equals(entry._id));
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) return;

  const target = siblings[targetIndex];
  const tmp = entry.order;
  entry.order = target.order;
  target.order = tmp;
  await Promise.all([entry.save(), target.save()]);

  revalidatePath('/plan');
}
