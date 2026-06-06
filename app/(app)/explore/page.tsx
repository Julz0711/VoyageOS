import { requireActiveTrip } from '@/lib/trips/active';
import { getExploreItems } from '@/lib/explore/queries';
import { ExploreView } from '@/components/explore/ExploreView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Explore' };

export default async function ExplorePage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const items = await getExploreItems(userId, trip.id);
  return <ExploreView items={items} />;
}
