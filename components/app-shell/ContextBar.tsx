'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus, Check, MapPin } from 'lucide-react';
import type { TripDTO } from '@/lib/dto';
import { strings } from '@/lib/strings';
import { formatDateRange, tripCountdown } from '@/lib/dates';
import { setActiveTrip } from '@/lib/trips/actions';
import { LogoMark } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

function coordLabel(lat: number, lng: number): string {
  const ns = `${lat >= 0 ? 'N' : 'S'} ${Math.abs(lat).toFixed(2)}°`;
  const ew = `${lng >= 0 ? 'E' : 'W'} ${Math.abs(lng).toFixed(2)}°`;
  return `${ns} · ${ew}`;
}

export function ContextBar({
  trips,
  activeTrip,
}: {
  trips: TripDTO[];
  activeTrip: TripDTO | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const countdown = activeTrip ? tripCountdown(activeTrip.dateStart, activeTrip.dateEnd) : null;

  function switchTo(tripId: string) {
    setOpen(false);
    startTransition(() => void setActiveTrip(tripId));
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      {/* Mobile brand row (sidebar is hidden on mobile; Settings lives in the bottom "More" sheet) */}
      <div className="flex items-center px-5 pt-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-display text-lg font-semibold text-ink">
            Voyage<span className="text-muted">OS</span>
          </span>
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 py-3 md:px-12 md:py-5">
        <div className="min-w-0">
          {activeTrip && (
            <p className="eyebrow mb-1 flex items-center gap-1.5 text-muted">
              <MapPin className="size-3" aria-hidden />
              {coordLabel(activeTrip.baseLocation.lat, activeTrip.baseLocation.lng)}
            </p>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="menu"
              disabled={isPending}
              className="group flex max-w-full items-center gap-2 text-left disabled:opacity-60"
            >
              <span className="truncate font-display text-2xl font-semibold leading-tight text-ink md:text-3xl">
                {activeTrip ? activeTrip.name : strings.trips.none}
              </span>
              <ChevronDown
                className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
                aria-hidden
              />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface text-ink shadow-lift"
              >
                <ul className="max-h-72 overflow-auto py-1">
                  {trips.map((trip) => (
                    <li key={trip.id}>
                      <button
                        role="menuitem"
                        onClick={() => switchTo(trip.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-canvas"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{trip.name}</span>
                          <span className="block truncate font-mono text-[11px] text-muted">
                            {trip.destination}
                          </span>
                        </span>
                        {activeTrip?.id === trip.id && (
                          <Check className="size-4 shrink-0 text-ink" aria-hidden />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/trips/new"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
                >
                  <Plus className="size-4" aria-hidden />
                  {strings.trips.newTrip}
                </Link>
              </div>
            )}
          </div>

          {activeTrip && (
            <p className="mt-1 font-mono text-xs text-muted">
              {activeTrip.destination} · {formatDateRange(activeTrip.dateStart, activeTrip.dateEnd)}
            </p>
          )}
        </div>

        {countdown && (
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-pill border px-3 py-1 font-mono text-xs',
              countdown.state === 'active'
                ? 'border-success/30 bg-success/10 text-success'
                : countdown.state === 'past'
                  ? 'border-border bg-surface text-muted'
                  : 'border-transparent bg-accent text-accent-foreground',
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {countdown.label.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
