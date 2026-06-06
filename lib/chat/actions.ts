'use server';

import { connectToDatabase } from '@/lib/db/connect';
import { requireActiveTrip } from '@/lib/trips/active';
import { ChatThread } from '@/models/ChatThread';

/** Clears the persisted chat thread for the active trip (scoped to the session user). */
export async function clearChat(): Promise<void> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return;
  await connectToDatabase();
  await ChatThread.updateOne({ userId, tripId: trip.id }, { $set: { uiMessages: [] } });
}
