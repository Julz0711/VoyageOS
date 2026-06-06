import { requireActiveTrip } from '@/lib/trips/active';
import { getPackingItems } from '@/lib/packing/queries';
import { PackView } from '@/components/packing/PackView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Pack' };

export default async function PackPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const items = await getPackingItems(userId, trip.id);
  return <PackView items={items} />;
}
