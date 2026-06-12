import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireSession } from '@/lib/auth/dal';
import { getTripById } from '@/lib/trips/queries';
import { getTripRecap } from '@/lib/trips/recap';
import { formatDateRange, tripDayCount } from '@/lib/dates';
import { DEFAULT_CURRENCY } from '@/config/expenses';
import { TripRecapView } from '@/components/trips/TripRecapView';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const trip = await getTripById(userId, id);
  return { title: trip ? `${trip.name} · Recap` : 'Recap' };
}

export default async function TripRecapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const trip = await getTripById(userId, id);
  if (!trip) notFound();

  const recap = await getTripRecap(userId, trip);

  return (
    <div className="space-y-8">
      <Link
        href={`/trips/${trip.id}`}
        className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back to trip
      </Link>

      <TripRecapView
        recap={recap}
        meta={{
          name: trip.name,
          destination: trip.destination,
          dateRange: formatDateRange(trip.dateStart, trip.dateEnd),
          dayCount: tripDayCount(trip.dateStart, trip.dateEnd),
          currency: trip.currency ?? DEFAULT_CURRENCY,
        }}
      />
    </div>
  );
}
