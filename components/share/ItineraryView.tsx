import { format } from 'date-fns';
import { MapPin, StickyNote } from 'lucide-react';
import type { SharedTrip } from '@/lib/trips/share';
import { getCategory } from '@/config/categories';
import { tripDays, formatDateRange, tripDayCount } from '@/lib/dates';
import { PrintButton } from './PrintButton';

/** Read-only, print-friendly itinerary. Used by the public /share page (no app shell). */
export function ItineraryView({ trip }: { trip: SharedTrip }) {
  const days = tripDays(trip.dateStart, trip.dateEnd);
  const dayCount = tripDayCount(trip.dateStart, trip.dateEnd);

  function entriesFor(key: string) {
    return trip.entries.filter((e) => e.date === key).sort((a, b) => a.order - b.order);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow text-muted">{dayCount} days · {trip.destination}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink md:text-4xl">{trip.name}</h1>
          <p className="mt-2 font-mono text-xs text-muted">{formatDateRange(trip.dateStart, trip.dateEnd)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" aria-hidden /> {trip.baseLabel}
          </p>
        </div>
        <PrintButton />
      </header>

      <section className="mt-8 space-y-6">
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const entries = entriesFor(key);
          return (
            <div key={key} className="break-inside-avoid">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">Day {i + 1}</h2>
                <span className="font-mono text-[11px] text-muted">{format(day, 'EEE d MMM')}</span>
              </div>
              {entries.length === 0 ? (
                <p className="mt-1 text-sm italic text-muted/70">Open day</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {entries.map((e) => {
                    const Icon = e.category ? getCategory(e.category).icon : StickyNote;
                    const meta = [e.startTime, e.areaLabel].filter(Boolean).join(' · ');
                    return (
                      <li key={e.id} className="flex items-center gap-2.5 text-sm text-ink">
                        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                        <span className="font-medium">{e.title}</span>
                        {meta && <span className="font-mono text-[11px] text-muted">· {meta}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {trip.items.length > 0 && (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="eyebrow mb-3 text-muted">Places ({trip.items.length})</h2>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {trip.items.map((item) => {
              const Icon = getCategory(item.category).icon;
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm text-ink">
                  <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
                  <span className="truncate">{item.title}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-10 border-t border-border pt-4 text-center font-mono text-[11px] text-muted">
        Made with VoyageOS
      </footer>
    </div>
  );
}
