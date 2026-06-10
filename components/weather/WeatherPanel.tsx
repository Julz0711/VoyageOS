'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Droplets, Wind, Sunrise, Sunset, Sun, X, MapPin } from 'lucide-react';
import type { ForecastDay, ForecastSource, ClimateSummary } from '@/lib/weather/openMeteo';
import { tripDays } from '@/lib/dates';
import { wmoInfo, wmoColor } from '@/lib/weather/wmo';
import { cn } from '@/lib/utils';

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function hhmm(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : format(d, 'HH:mm');
}

/** Human-readable "where this forecast came from" from Open-Meteo's resolved grid point. */
function sourceLabel(source: ForecastSource | null): string {
  if (!source) return 'data from Open-Meteo';
  const lat = `${Math.abs(source.lat).toFixed(2)}°${source.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(source.lng).toFixed(2)}°${source.lng >= 0 ? 'E' : 'W'}`;
  const parts = [`${lat}, ${lng}`];
  if (source.elevation != null) parts.push(`${Math.round(source.elevation)} m`);
  return `Open-Meteo · nearest grid point ${parts.join(' · ')}`;
}

export function WeatherPanel({
  forecast,
  climate,
  tripStart,
  tripEnd,
  source,
}: {
  forecast: ForecastDay[];
  climate: ClimateSummary | null;
  tripStart: string;
  tripEnd: string;
  source: ForecastSource | null;
}) {
  const byDate = useMemo(() => new Map(forecast.map((f) => [f.date, f])), [forecast]);
  const days = useMemo(() => tripDays(tripStart, tripEnd), [tripStart, tripEnd]);
  const [selected, setSelected] = useState<Date | null>(null);

  const hasGaps = days.some((d) => !byDate.has(ymd(d)));
  const selectedFc = selected ? byDate.get(ymd(selected)) : undefined;

  return (
    <section className="border-border bg-surface shadow-card rounded-lg border p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="eyebrow text-muted">Forecast · {days.length} days</h2>
        <span className="text-muted font-sans text-[11px]">tap a day for detail</span>
      </div>
      <p className="text-muted mb-4 flex items-center gap-1.5 font-sans text-[11px]">
        <MapPin className="size-3" aria-hidden />
        {sourceLabel(source)}
      </p>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day) => {
          const fc = byDate.get(ymd(day));
          return (
            <DayCard
              key={ymd(day)}
              day={day}
              fc={fc}
              climate={climate}
              onClick={() => setSelected(day)}
            />
          );
        })}
      </div>

      {hasGaps && (
        <p className="text-muted mt-3 text-xs leading-relaxed">
          Days beyond the 16-day forecast show{' '}
          <strong className="text-ink font-medium">seasonal averages</strong>
          {climate ? ` (typical for these dates, from ${climate.yearsUsed.join(', ')})` : ''} — not
          a precise forecast.
        </p>
      )}

      {selected && (
        <DayModal
          day={selected}
          fc={selectedFc}
          climate={climate}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function DayCard({
  day,
  fc,
  climate,
  onClick,
}: {
  day: Date;
  fc?: ForecastDay;
  climate: ClimateSummary | null;
  onClick: () => void;
}) {
  const Icon = fc ? wmoInfo(fc.code).icon : Sun;
  // Hover tint follows the day's weather (sun → amber, rain → blue, …); neutral for averages.
  const accent = fc ? wmoColor(fc.code) : 'var(--vos-color-muted)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ '--c': accent } as React.CSSProperties}
      className={cn(
        'group flex min-w-[5.25rem] shrink-0 flex-col items-center gap-1 rounded-md border border-border px-3 py-3 text-center transition-colors duration-200',
        'hover:border-[color-mix(in_srgb,var(--c)_50%,var(--vos-color-border))]',
        'hover:bg-[color-mix(in_srgb,var(--c)_10%,var(--vos-color-surface))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--c)_55%,transparent)]',
        fc ? 'bg-canvas/40' : 'bg-canvas/20',
      )}
    >
      <span className="eyebrow text-muted">{format(day, 'EEE')}</span>
      <span className="text-muted/70 font-sans text-[11px]">{format(day, 'd MMM')}</span>
      <Icon
        className={cn(
          'my-1 size-6 transition-colors group-hover:text-[var(--c)]',
          fc ? 'text-primary' : 'text-muted',
        )}
        aria-hidden
      />
      {fc ? (
        <>
          <span className="num text-sm">
            <span className="text-ink">{fc.tMax}°</span>{' '}
            <span className="text-muted">{fc.tMin}°</span>
          </span>
          {fc.precipProbMax != null && (
            <span className="text-accent-2 num flex items-center gap-0.5 text-[11px]">
              <Droplets className="size-3" aria-hidden />
              {fc.precipProbMax}%
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-muted num text-sm">
            {climate ? `${climate.avgTMax}° ${climate.avgTMin}°` : '—'}
          </span>
          <span className="text-muted/70 font-sans text-[10px] tracking-wide uppercase">avg</span>
        </>
      )}
    </button>
  );
}

function DayModal({
  day,
  fc,
  climate,
  onClose,
}: {
  day: Date;
  fc?: ForecastDay;
  climate: ClimateSummary | null;
  onClose: () => void;
}) {
  const info = fc ? wmoInfo(fc.code) : null;
  const Icon = info?.icon ?? Sun;

  return (
    <div
      className="bg-ink/30 fixed inset-0 z-50 flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-border bg-surface shadow-lift w-full max-w-md overflow-hidden rounded-lg border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="border-border flex items-start justify-between gap-3 border-b p-5">
          <div className="flex items-center gap-3">
            <Icon className="text-primary size-9" aria-hidden />
            <div>
              <h2 className="font-heading text-ink text-lg font-semibold">
                {format(day, 'EEEE d MMM')}
              </h2>
              <p className="text-muted text-sm">{fc ? info?.label : 'Seasonal average'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {fc ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-ink text-3xl font-semibold">{fc.tMax}°</span>
                <span className="text-muted font-sans text-lg">{fc.tMin}°</span>
                {fc.precipProbMax != null && (
                  <span className="text-accent-2 ml-auto flex items-center gap-1 font-sans text-sm">
                    <Droplets className="size-4" aria-hidden />
                    {fc.precipProbMax}%
                  </span>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3">
                {fc.windMax != null && (
                  <Fact icon={Wind} label="Wind" value={`${fc.windMax} km/h`} />
                )}
                {fc.uvMax != null && <Fact icon={Sun} label="UV index" value={`${fc.uvMax}`} />}
                {hhmm(fc.sunrise) && (
                  <Fact icon={Sunrise} label="Sunrise" value={hhmm(fc.sunrise)!} />
                )}
                {hhmm(fc.sunset) && <Fact icon={Sunset} label="Sunset" value={hhmm(fc.sunset)!} />}
                {fc.precipHours != null && (
                  <Fact icon={Droplets} label="Precip hours" value={`${fc.precipHours}h`} />
                )}
              </dl>

              {fc.hours && fc.hours.length > 0 && (
                <div>
                  <p className="eyebrow text-muted mb-2">Hourly</p>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {fc.hours
                      .filter((_, i) => i % 2 === 0)
                      .map((h) => {
                        const HIcon = wmoInfo(h.code).icon;
                        return (
                          <div
                            key={h.time}
                            className="border-border bg-canvas/40 flex min-w-12 shrink-0 flex-col items-center gap-1 rounded-md border px-2 py-2 text-center"
                          >
                            <span className="text-muted font-sans text-[10px]">
                              {h.time.slice(11, 16)}
                            </span>
                            <HIcon className="text-primary size-4" aria-hidden />
                            <span className="text-ink font-sans text-xs">{h.temp}°</span>
                            {h.precipProb != null && (
                              <span className="text-accent-2 font-sans text-[10px]">
                                {h.precipProb}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {climate ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Fact icon={Sun} label="Avg high" value={`${climate.avgTMax}°`} />
                    <Fact icon={Sun} label="Avg low" value={`${climate.avgTMin}°`} />
                    <Fact icon={Droplets} label="Avg rain/day" value={`${climate.avgPrecip} mm`} />
                    <Fact icon={Droplets} label="Rainy days" value={`${climate.rainyDayPct}%`} />
                  </div>
                  <p className="border-border bg-canvas/40 text-muted rounded-md border border-dashed px-3 py-2 text-xs leading-relaxed">
                    <strong className="text-ink font-medium">
                      Seasonal average, not a forecast.
                    </strong>{' '}
                    Typical conditions for these dates, from {climate.yearsUsed.join(', ')}.
                  </p>
                </>
              ) : (
                <p className="text-muted text-sm">
                  This day is beyond the 16-day forecast and no seasonal data is available.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="border-border bg-canvas/40 rounded-md border px-3 py-2.5">
      <span className="text-muted flex items-center gap-1.5 text-[11px] tracking-wide uppercase">
        <Icon className="size-3" aria-hidden /> {label}
      </span>
      <span className="text-ink mt-0.5 block font-sans text-base">{value}</span>
    </div>
  );
}
