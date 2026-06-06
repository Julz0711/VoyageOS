import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSharedTrip } from '@/lib/trips/share';
import { ItineraryView } from '@/components/share/ItineraryView';

export const metadata: Metadata = {
  title: 'Shared itinerary',
  robots: { index: false, follow: false }, // unlisted link, don't index
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trip = await getSharedTrip(token);
  if (!trip) notFound();

  return (
    <main className="min-h-dvh bg-canvas">
      <ItineraryView trip={trip} />
    </main>
  );
}
