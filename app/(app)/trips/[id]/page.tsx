import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  Pencil,
  Compass,
  CalendarRange,
  Luggage,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { requireSession } from '@/lib/auth/dal';
import { getTripById } from '@/lib/trips/queries';
import { getTripStats } from '@/lib/trips/stats';
import { formatDateRange, tripCountdown, tripDayCount } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { TripCover } from '@/components/trips/TripCover';
import { DeleteTripButton } from '@/components/trips/DeleteTripButton';
import { TripSectionNav } from '@/components/trips/TripSectionNav';

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

  const stats = await getTripStats(userId, trip.id);
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
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {strings.nav.dashboard}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <TripCover
          destination={trip.destination}
          lat={trip.baseLocation.lat}
          lng={trip.baseLocation.lng}
          badge={countdown.label.toUpperCase()}
          coverImage={trip.coverImage}
          className="h-40 sm:h-52"
        />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p
              className="eyebrow mb-1 flex items-center gap-1.5"
              style={{ color: statusColor }}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {countdown.label}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
              {trip.name}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-muted">
              {trip.destination} · {formatDateRange(trip.dateStart, trip.dateEnd)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/trips/${trip.id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil className="size-4" aria-hidden /> Edit
              </Button>
            </Link>
            <DeleteTripButton tripId={trip.id} tripName={trip.name} redirectTo="/dashboard" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Places"
          value={String(stats.exploreCount)}
          icon={Compass}
          color="var(--vos-color-map-swim)"
        />
        <StatCard
          label="Duration"
          value={`${dayCount} ${dayCount === 1 ? 'day' : 'days'}`}
          icon={CalendarRange}
          color="var(--vos-color-map-food)"
        />
        <StatCard
          label="Packed"
          value={`${stats.packedCount}/${stats.packingTotal}`}
          icon={Luggage}
          color="var(--vos-color-map-hike)"
        />
        <StatCard
          label="Documents"
          value={String(stats.documentsCount)}
          icon={FileText}
          color="var(--vos-color-map-culture)"
        />
      </div>

      {/* Section navigation */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="eyebrow text-ink">Jump to</h2>
          <hr className="atlas-rule flex-1" />
        </div>
        <TripSectionNav tripId={trip.id} stats={stats} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-surface p-4 shadow-card"
      style={{ '--c': color } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--c)_16%,transparent)] text-[var(--c)]">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="eyebrow text-muted/70">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
