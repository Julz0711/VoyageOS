import { requireActiveTrip } from '@/lib/trips/active';
import { getExploreItems } from '@/lib/explore/queries';
import { getPlanEntries } from '@/lib/calendar/queries';
import { MapView } from '@/components/map/MapView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Map' };

export default async function MapPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [items, entries] = await Promise.all([
    getExploreItems(userId, trip.id),
    getPlanEntries(userId, trip.id),
  ]);
  return <MapView trip={trip} items={items} entries={entries} />;
}
