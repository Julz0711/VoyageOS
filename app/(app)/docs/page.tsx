import { requireActiveTrip } from '@/lib/trips/active';
import { getDocuments } from '@/lib/documents/queries';
import { getExploreItems } from '@/lib/explore/queries';
import { DocsView } from '@/components/documents/DocsView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Documents' };

export default async function DocsPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [documents, exploreItems] = await Promise.all([
    getDocuments(userId, trip.id),
    getExploreItems(userId, trip.id),
  ]);

  return (
    <DocsView
      documents={documents}
      exploreItems={exploreItems.map((i) => ({ id: i.id, title: i.title }))}
    />
  );
}
