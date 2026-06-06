import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { requireSession } from '@/lib/auth/dal';
import { getTrips } from '@/lib/trips/queries';
import { getTripStats } from '@/lib/trips/stats';
import { formatDateRange, tripCountdown } from '@/lib/dates';
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
          <p className="eyebrow mb-1 text-muted">Your atlas</p>
          <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">
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
        <div className="rounded-lg border border-dashed border-border bg-surface/50 py-16 text-center text-muted">
          {strings.trips.none}.{' '}
          <Link href="/trips/new" className="font-medium text-ink underline">
            {strings.trips.create}
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="eyebrow text-ink">Upcoming</h2>
            <span className="font-mono text-[11px] text-muted">
              {String(upcoming.length).padStart(2, '0')}
            </span>
            <hr className="atlas-rule flex-1" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {upcoming.map(({ trip, stats }, i) => {
              const countdown = tripCountdown(trip.dateStart, trip.dateEnd);
              const pct = stats.packingTotal
                ? Math.round((stats.packedCount / stats.packingTotal) * 100)
                : 0;
              return (
                <article
                  key={trip.id}
                  className="group flex animate-fade-up flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow duration-200 hover:shadow-lift"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
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
                      <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
                        {trip.name}
                      </h3>
                      <span className="-mr-1.5 flex shrink-0 items-center gap-0.5">
                        <Link
                          href={`/trips/${trip.id}/edit`}
                          aria-label={`Edit ${trip.name}`}
                          className="p-1.5 text-muted/60 transition-colors hover:text-ink"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                        <DeleteTripButton tripId={trip.id} tripName={trip.name} />
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {formatDateRange(trip.dateStart, trip.dateEnd)}
                    </p>

                    <div className="mt-6 flex items-center gap-6 font-mono text-[11px] text-muted">
                      <Stat label="EXPLORE" value={String(stats.exploreCount).padStart(2, '0')} />
                      <Stat label="DAYS" value={String(stats.plannedDays).padStart(2, '0')} />
                      <Stat label="PACKED" value={`${stats.packedCount}/${stats.packingTotal}`} />
                      <Stat label="DOCS" value={String(stats.documentsCount).padStart(2, '0')} />
                    </div>

                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-pill bg-ink/[0.06]">
                      <div
                        className="h-full rounded-pill bg-success transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                      <QuickLink href="/explore" label={strings.nav.explore} />
                      <QuickLink href="/plan" label={strings.nav.plan} />
                      <QuickLink href="/map" label={strings.nav.map} />
                      <QuickLink href="/pack" label={strings.nav.pack} />
                      <QuickLink href="/docs" label={strings.nav.docs} />
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
          <div className="divide-y divide-border rounded-lg border border-border bg-surface">
            {archived.map(({ trip }) => (
              <div key={trip.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <span className="truncate text-sm text-ink">{trip.name}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted">
                    {formatDateRange(trip.dateStart, trip.dateEnd)}
                  </span>
                  <Link
                    href={`/trips/${trip.id}/edit`}
                    aria-label={`Edit ${trip.name}`}
                    className="p-1 text-muted/60 transition-colors hover:text-ink"
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
      <span className="block text-[10px] tracking-wider text-muted/70">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-pill border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/30"
    >
      {label}
    </Link>
  );
}
