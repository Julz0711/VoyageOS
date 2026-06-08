import Link from 'next/link';
import { Plus, Pencil, ArrowRight } from 'lucide-react';
import { requireSession } from '@/lib/auth/dal';
import { getTrips } from '@/lib/trips/queries';
import { getTripStats } from '@/lib/trips/stats';
import { formatDateRange, tripCountdown, tripDayCount } from '@/lib/dates';
import { strings } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { TripCover } from '@/components/trips/TripCover';
import { DeleteTripButton } from '@/components/trips/DeleteTripButton';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { userId, name } = await requireSession();
  const trips = await getTrips(userId);
  const withStats = await Promise.all(
    trips.map(async (trip) => ({ trip, stats: await getTripStats(userId, trip.id) })),
  );

  const upcoming = withStats.filter(({ trip }) => !trip.archived);
  const archived = withStats.filter(({ trip }) => trip.archived);

  return (
    <div className="space-y-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted mb-1">Your atlas</p>
          <h1 className="font-display text-ink text-3xl font-semibold md:text-4xl">
            {name ? `Hello, ${name.split(' ')[0]}` : strings.nav.dashboard}
          </h1>
        </div>
        <Link href="/trips/new">
          <Button>
            <Plus className="size-4" aria-hidden /> {strings.trips.newTrip}
          </Button>
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <div className="border-border bg-surface/50 text-muted rounded-lg border border-dashed py-16 text-center">
          {strings.trips.none}.{' '}
          <Link href="/trips/new" className="text-ink font-medium underline">
            {strings.trips.create}
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="eyebrow text-ink">Upcoming</h2>
            <span className="text-muted font-sans text-[11px]">
              {String(upcoming.length).padStart(2, '0')}
            </span>
            <hr className="atlas-rule flex-1" />
          </div>

          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-6">
            {upcoming.map(({ trip, stats }, i) => {
              const countdown = tripCountdown(trip.dateStart, trip.dateEnd);
              const pct = stats.packingTotal
                ? Math.round((stats.packedCount / stats.packingTotal) * 100)
                : 0;
              return (
                <article
                  key={trip.id}
                  className="group animate-fade-up border-border bg-surface shadow-card hover:shadow-lift relative flex flex-col overflow-hidden rounded-lg border transition-all duration-200 hover:z-10 hover:scale-[1.02]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Stretched link — the whole card opens the trip summary. Action buttons
                      below sit above this overlay via z-index so they stay clickable. */}
                  <Link
                    href={`/trips/${trip.id}`}
                    aria-label={`Open ${trip.name}`}
                    className="focus-visible:ring-accent/50 absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  />

                  <TripCover
                    destination={trip.destination}
                    lat={trip.baseLocation.lat}
                    lng={trip.baseLocation.lng}
                    badge={countdown.label.toUpperCase()}
                    coverImage={trip.coverImage}
                    className="h-32"
                  />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-ink text-2xl leading-tight font-semibold">
                        {trip.name}
                      </h3>
                      <span className="relative z-20 -mr-1.5 flex shrink-0 items-center gap-0.5">
                        <Link
                          href={`/trips/${trip.id}/edit`}
                          aria-label={`Edit ${trip.name}`}
                          className="text-muted/60 hover:text-ink p-1.5 transition-colors"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                        <DeleteTripButton tripId={trip.id} tripName={trip.name} />
                      </span>
                    </div>
                    <p className="text-muted mt-1 font-sans text-xs">
                      {formatDateRange(trip.dateStart, trip.dateEnd)}
                    </p>

                    <div className="text-muted mt-6 flex items-center gap-6 font-sans text-[11px]">
                      <Stat label="EXPLORE" value={String(stats.exploreCount).padStart(2, '0')} />
                      <Stat
                        label="DAYS"
                        value={String(tripDayCount(trip.dateStart, trip.dateEnd)).padStart(2, '0')}
                      />
                      <Stat label="PACKED" value={`${stats.packedCount}/${stats.packingTotal}`} />
                      <Stat label="DOCS" value={String(stats.documentsCount).padStart(2, '0')} />
                    </div>

                    <div className="rounded-pill bg-ink/[0.06] mt-2.5 h-1.5 w-full overflow-hidden">
                      <div
                        className="rounded-pill bg-success h-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="text-ink mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium">
                      Open trip
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {archived.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="eyebrow text-muted">Past trips</h2>
            <hr className="atlas-rule flex-1" />
          </div>
          <div className="divide-border border-border bg-surface divide-y rounded-lg border">
            {archived.map(({ trip }) => (
              <div key={trip.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <Link
                  href={`/trips/${trip.id}`}
                  className="text-ink hover:text-muted truncate text-sm transition-colors"
                >
                  {trip.name}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-muted font-sans text-[11px]">
                    {formatDateRange(trip.dateStart, trip.dateEnd)}
                  </span>
                  <Link
                    href={`/trips/${trip.id}/edit`}
                    aria-label={`Edit ${trip.name}`}
                    className="text-muted/60 hover:text-ink p-1 transition-colors"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <DeleteTripButton tripId={trip.id} tripName={trip.name} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted/70 block text-[10px] tracking-wider">{label}</span>
      <span className="text-ink text-sm font-medium">{value}</span>
    </div>
  );
}
