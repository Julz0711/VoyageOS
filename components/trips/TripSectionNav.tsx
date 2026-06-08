'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  MessageCircle,
  Route,
  Map as MapIcon,
  CalendarDays,
  Luggage,
  Wallet,
  ListChecks,
  FileText,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { setActiveTrip } from '@/lib/trips/actions';
import { strings } from '@/lib/strings';
import type { TripStats } from '@/lib/trips/stats';
import { cn } from '@/lib/utils';

type Section = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Theme color (CSS var) used to tint the card — see config/theme.ts. */
  color: string;
  hint: (s: TripStats) => string;
};

const sections: Section[] = [
  { href: '/explore', label: strings.nav.explore, icon: Compass, color: 'var(--vos-color-map-swim)', hint: (s) => `${s.exploreCount} ${s.exploreCount === 1 ? 'place' : 'places'}` },
  { href: '/chat', label: strings.nav.chat, icon: MessageCircle, color: 'var(--vos-color-map-culture)', hint: () => 'Plan with AI' },
  { href: '/roadtrips', label: strings.nav.roadtrips, icon: Route, color: 'var(--vos-color-map-food)', hint: () => 'Routes & stops' },
  { href: '/map', label: strings.nav.map, icon: MapIcon, color: 'var(--vos-color-accent2)', hint: () => 'See it on the map' },
  { href: '/plan', label: strings.nav.plan, icon: CalendarDays, color: 'var(--vos-color-map-hike)', hint: () => 'Day-by-day' },
  { href: '/pack', label: strings.nav.pack, icon: Luggage, color: 'var(--vos-color-map-culture)', hint: (s) => (s.packingTotal ? `${s.packedCount}/${s.packingTotal} packed` : 'Build your kit') },
  { href: '/budget', label: strings.nav.budget, icon: Wallet, color: 'var(--vos-color-map-food)', hint: () => 'Track spend' },
  { href: '/checklist', label: strings.nav.checklist, icon: ListChecks, color: 'var(--vos-color-map-swim)', hint: () => 'To-dos' },
  { href: '/docs', label: strings.nav.docs, icon: FileText, color: 'var(--vos-color-success)', hint: (s) => (s.documentsCount ? `${s.documentsCount} ${s.documentsCount === 1 ? 'file' : 'files'}` : 'Files & bookings') },
];

export function TripSectionNav({ tripId, stats }: { tripId: string; stats: TripStats }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  function open(href: string) {
    setTarget(href);
    startTransition(async () => {
      await setActiveTrip(tripId);
      router.push(href);
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sections.map(({ href, label, icon: Icon, color, hint }) => {
        const loading = pending && target === href;
        return (
          <button
            key={href}
            type="button"
            onClick={() => open(href)}
            disabled={pending}
            style={{ '--c': color } as React.CSSProperties}
            className={cn(
              'group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-card transition-all',
              'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--c)_45%,var(--vos-color-border))] hover:shadow-lift',
              'hover:bg-[color-mix(in_srgb,var(--c)_6%,var(--vos-color-surface))]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--c)_60%,transparent)]',
              'disabled:pointer-events-none disabled:opacity-60',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[var(--c)] transition-colors group-hover:bg-[var(--c)] group-hover:text-white">
              {loading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Icon className="size-5" aria-hidden />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{label}</span>
              <span className="block truncate font-mono text-[11px] text-muted">{hint(stats)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
