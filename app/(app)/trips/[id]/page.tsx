import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Pencil, ScrollText } from 'lucide-react';
import { requireSession } from '@/lib/auth/dal';
import { getTripById } from '@/lib/trips/queries';
import { getTripSummary } from '@/lib/trips/summary';
import { formatDateRange, tripCountdown, tripDayCount } from '@/lib/dates';
import { DEFAULT_CURRENCY } from '@/config/expenses';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { TripCover } from '@/components/trips/TripCover';
import { DeleteTripButton } from '@/components/trips/DeleteTripButton';
import { TripSummary } from '@/components/trips/TripSummary';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const trip = await getTripById(userId, id);
  return { title: trip?.name ?? 'Trip' };
}

export default async function TripSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await requireSession();
  const trip = await getTripById(userId, id);
  if (!trip) notFound();

  const summary = await getTripSummary(userId, trip.id, trip.dateStart, trip.dateEnd);
  const countdown = tripCountdown(trip.dateStart, trip.dateEnd);
  const dayCount = tripDayCount(trip.dateStart, trip.dateEnd);

  const statusColor =
    countdown.state === 'active'
      ? 'var(--vos-color-success)'
      : countdown.state === 'upcoming'
        ? 'var(--vos-color-accent2)'
        : 'var(--vos-color-muted)';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="text-muted hover:text-ink inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {strings.nav.dashboard}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/trips/${trip.id}/recap`}>
            <Button variant={countdown.state === 'past' ? 'primary' : 'secondary'} size="sm">
              <ScrollText className="size-4" aria-hidden /> Recap
            </Button>
          </Link>
          <Link href={`/trips/${trip.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="size-4" aria-hidden /> Edit
            </Button>
          </Link>
          <DeleteTripButton tripId={trip.id} tripName={trip.name} redirectTo="/dashboard" />
        </div>
      </div>

      {/* Hero */}
      <div className="border-border bg-surface shadow-card overflow-hidden rounded-lg border">
        <TripCover
          destination={trip.destination}
          lat={trip.baseLocation.lat}
          lng={trip.baseLocation.lng}
          badge={countdown.label.toUpperCase()}
          coverImage={trip.coverImage}
          className="h-40 sm:h-52"
        />
        <div className="p-5 sm:p-6">
          <p className="eyebrow mb-1 flex items-center gap-1.5" style={{ color: statusColor }}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {countdown.label}
          </p>
          <h1 className="font-display text-ink text-3xl leading-tight font-semibold md:text-4xl">
            {trip.name}
          </h1>
          <p className="text-muted mt-1.5 font-sans text-xs">
            {trip.destination} · {formatDateRange(trip.dateStart, trip.dateEnd)} · {dayCount}{' '}
            {dayCount === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      {/* Section summaries */}
      <TripSummary
        tripId={trip.id}
        summary={summary}
        base={{ lat: trip.baseLocation.lat, lng: trip.baseLocation.lng }}
        currency={trip.currency ?? DEFAULT_CURRENCY}
        budget={trip.budget}
        phaseBudgets={trip.phaseBudgets}
      />
    </div>
  );
}
