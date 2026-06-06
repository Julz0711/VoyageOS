import { format } from 'date-fns';
import { MapPin, StickyNote, Droplets } from 'lucide-react';
import type { SharedTrip } from '@/lib/trips/share';
import type { ForecastDay, ClimateSummary } from '@/lib/weather/openMeteo';
import { getCategory, categoryColor } from '@/config/categories';
import { wmoInfo } from '@/lib/weather/wmo';
import { tripDays, formatDateRange, tripDayCount } from '@/lib/dates';
import { LogoMark } from '@/components/brand/Logo';
import { PrintButton } from './PrintButton';

const HERO_GRADIENT =
  'linear-gradient(135deg, var(--vos-color-primary) 0%, var(--vos-color-map-swim) 58%, var(--vos-color-accent) 130%)';

/** Read-only, print-friendly itinerary with per-day weather. Used by the public /share page. */
export function ItineraryView({ trip }: { trip: SharedTrip }) {
  const days = tripDays(trip.dateStart, trip.dateEnd);
  const dayCount = tripDayCount(trip.dateStart, trip.dateEnd);
  const byDate = new Map(trip.forecast.map((f) => [f.date, f]));

  function entriesFor(key: string) {
    return trip.entries.filter((e) => e.date === key).sort((a, b) => a.order - b.order);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        {/* Hero — custom header image when set, else the signature gradient. */}
        <div
          className="relative overflow-hidden p-7 text-primary-foreground md:p-9"
          style={
            trip.coverImage
              ? {
                  backgroundImage: `linear-gradient(180deg, color-mix(in srgb, var(--vos-color-primary) 20%, transparent), color-mix(in srgb, var(--vos-color-primary) 78%, transparent)), url("${trip.coverImage.replace(/"/g, '')}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { background: HERO_GRADIENT }
          }
        >
          {!trip.coverImage && (
            <svg
              aria-hidden
              className="absolute -right-12 -top-20 h-72 w-72"
              viewBox="-160 -160 320 320"
              style={{ opacity: 0.16 }}
            >
              {[34, 58, 82, 106, 130, 154].map((r, i) => (
                <ellipse
                  key={r}
                  cx={0}
                  cy={0}
                  rx={r}
                  ry={r * 0.8}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                  transform={`rotate(${-16 + i * 2})`}
                />
              ))}
            </svg>
          )}
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground/80">
              {dayCount} days · {trip.destination}
            </p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight md:text-4xl">
              {trip.name}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-primary-foreground/85">
              <span>{formatDateRange(trip.dateStart, trip.dateEnd)}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden /> {trip.baseLabel}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-8 p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow text-muted">Day by day</h2>
            <PrintButton />
          </div>

          {/* Days */}
          <section className="space-y-3">
            {days.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const entries = entriesFor(key);
              const fc = byDate.get(key);
              return (
                <div key={key} className="break-inside-avoid rounded-lg border border-border bg-canvas/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold text-ink">Day {i + 1}</h3>
                      <span className="font-mono text-[11px] text-muted">{format(day, 'EEE d MMM')}</span>
                    </div>
                    <DayWeather fc={fc} climate={trip.climate} />
                  </div>

                  {entries.length === 0 ? (
                    <p className="mt-2 text-sm italic text-muted/70">Open day</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {entries.map((e) => {
                        const Icon = e.category ? getCategory(e.category).icon : StickyNote;
                        const color = e.category ? categoryColor(e.category) : 'var(--vos-color-muted)';
                        const meta = [e.startTime, e.areaLabel].filter(Boolean).join(' · ');
                        return (
                          <li key={e.id} className="flex items-center gap-2.5">
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full"
                              style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                            >
                              <Icon className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                              {meta && <span className="block truncate font-mono text-[11px] text-muted">{meta}</span>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          {/* Places */}
          {trip.items.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3 text-muted">All places · {trip.items.length}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {trip.items.map((item) => {
                  const Icon = getCategory(item.category).icon;
                  const color = categoryColor(item.category);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 rounded-md border border-border bg-canvas/30 px-3 py-2"
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                        {item.location?.areaLabel && (
                          <span className="block truncate font-mono text-[11px] text-muted">
                            {item.location.areaLabel}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-center gap-2 border-t border-border py-4 font-mono text-[11px] text-muted">
          <LogoMark className="size-5" /> Made with VoyageOS
        </footer>
      </div>
    </div>
  );
}

/** Compact per-day weather: live forecast when available, else the seasonal average. */
function DayWeather({ fc, climate }: { fc?: ForecastDay; climate: ClimateSummary | null }) {
  if (fc) {
    const Icon = wmoInfo(fc.code).icon;
    return (
      <span className="flex items-center gap-2 rounded-md bg-surface px-2.5 py-1.5 text-right">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="font-mono text-xs">
          <span className="text-ink">{fc.tMax}°</span> <span className="text-muted">{fc.tMin}°</span>
        </span>
        {fc.precipProbMax != null && fc.precipProbMax > 0 && (
          <span className="flex items-center gap-0.5 font-mono text-[11px] text-accent-2">
            <Droplets className="size-3" aria-hidden />
            {fc.precipProbMax}%
          </span>
        )}
      </span>
    );
  }
  if (climate) {
    return (
      <span className="rounded-md bg-surface px-2.5 py-1.5 text-right font-mono text-xs text-muted" title="Seasonal average">
        <span className="text-ink">{climate.avgTMax}°</span> {climate.avgTMin}°
        <span className="ml-1 text-[10px] uppercase tracking-wide">avg</span>
      </span>
    );
  }
  return null;
}
