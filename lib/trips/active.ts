import 'server-only';
import { requireSession } from '@/lib/auth/dal';
import { getActiveTrip } from '@/lib/trips/queries';
import type { TripDTO } from '@/lib/dto';

/** Session user + their active trip (or null if they have none yet). */
export async function requireActiveTrip(): Promise<{ userId: string; trip: TripDTO | null }> {
  const { userId } = await requireSession();
  const trip = await getActiveTrip(userId);
  return { userId, trip };
}
