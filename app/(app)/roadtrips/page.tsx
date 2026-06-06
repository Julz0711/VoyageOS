import { requireActiveTrip } from '@/lib/trips/active';
import { getRoadtrips } from '@/lib/roadtrips/queries';
import { getExploreItems } from '@/lib/explore/queries';
import { RoadtripsView } from '@/components/roadtrips/RoadtripsView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Roadtrips' };

export default async function RoadtripsPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [roadtrips, items] = await Promise.all([
    getRoadtrips(userId, trip.id),
    getExploreItems(userId, trip.id),
  ]);

  // Candidate stops: real places, not other roadtrip cards.
  const candidates = items
    .filter((i) => i.category !== 'road-trip')
    .map((i) => ({ id: i.id, title: i.title, category: i.category }));

  return (
    <RoadtripsView
      roadtrips={roadtrips}
      candidates={candidates}
      base={{ lat: trip.baseLocation.lat, lng: trip.baseLocation.lng, label: trip.baseLocation.label }}
    />
  );
}
