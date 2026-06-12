import { format } from 'date-fns';
import { requireActiveTrip } from '@/lib/trips/active';
import { getPhotos } from '@/lib/photos/queries';
import { getExploreItems } from '@/lib/explore/queries';
import { tripDays } from '@/lib/dates';
import { PhotosView } from '@/components/photos/PhotosView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Photos' };

export default async function PhotosPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [photos, items] = await Promise.all([
    getPhotos(userId, trip.id),
    getExploreItems(userId, trip.id),
  ]);

  const exploreItems = items.map((i) => ({ id: i.id, title: i.title, category: i.category }));
  const days = tripDays(trip.dateStart, trip.dateEnd).map((d) => format(d, 'yyyy-MM-dd'));

  return <PhotosView photos={photos} exploreItems={exploreItems} days={days} />;
}
