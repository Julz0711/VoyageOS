'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Compass,
  CalendarDays,
  Route,
  Map as MapIcon,
  Luggage,
  Wallet,
  ListChecks,
  FileText,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { setActiveTrip } from '@/lib/trips/actions';
import { categoryColor } from '@/config/categories';
import { getExpenseCategory, formatMoney } from '@/config/expenses';
import { cn } from '@/lib/utils';
import { MiniMap } from './MiniMap';
import type { TripSummary as TripSummaryData } from '@/lib/trips/summary';

// One canonical colour per section, used consistently (fixes the earlier mismatch where the
// same section was tinted differently in the stat row vs. the quick-links).
const COLORS = {
  explore: 'var(--vos-color-map-swim)',
  plan: 'var(--vos-color-map-hike)',
  roadtrips: 'var(--vos-color-map-food)',
  map: 'var(--vos-color-map-culture)',
  pack: 'var(--vos-color-accent2)',
  budget: 'var(--vos-color-success)',
  checklist: 'var(--vos-color-primary)',
  docs: 'var(--vos-color-muted)',
} as const;

const DOC_LABEL: Record<string, string> = {
  ticket: 'Ticket',
  booking: 'Booking',
  reservation: 'Reservation',
  insurance: 'Insurance',
  id: 'ID',
  map: 'Map',
  other: 'File',
};

function fmtDay(date: string): string {
  try {
    return format(parseISO(date), 'EEE d MMM');
  } catch {
    return date;
  }
}

export function TripSummary({
  tripId,
  summary,
  base,
  currency,
  budget,
}: {
  tripId: string;
  summary: TripSummaryData;
  base: { lat: number; lng: number };
  currency: string;
  budget?: number;
}) {
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

  const { explore, plan, roadtrips, map, packing, budget: spend, checklist, docs } = summary;
  const packPct = packing.total ? Math.round((packing.packed / packing.total) * 100) : 0;
  const budgetPct =
    budget && budget > 0 ? Math.min(100, Math.round((spend.total / budget) * 100)) : 0;
  const overBudget = budget != null && spend.total > budget;

  // The section cards in reading order. Rendered as a single column on mobile, and split into
  // two vertical masonry columns (left-to-right: even → left, odd → right) on sm+.
  const cards = [
    <Card
      key="explore"
      color={COLORS.explore}
      icon={Compass}
      label="Explore"
      meta={explore.total ? `${explore.total} ${explore.total === 1 ? 'place' : 'places'}` : 'Empty'}
      href="/explore"
      onOpen={open}
      loading={pending && target === '/explore'}
      anyPending={pending}
    >
      {explore.preview.length ? (
        <ul className="space-y-2">
          {explore.preview.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor(p.category) }}
                aria-hidden
              />
              <span className="text-ink truncate text-sm">{p.title}</span>
              {p.areaLabel && (
                <span className="text-muted/70 ml-auto shrink-0 truncate font-sans text-[11px]">
                  {p.areaLabel}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Start your field guide — add places to explore.</Empty>
      )}
    </Card>,

    <Card
      key="plan"
      color={COLORS.plan}
      icon={CalendarDays}
      label="Plan"
      meta={plan.days ? `${plan.days} ${plan.days === 1 ? 'day' : 'days'} planned` : 'Empty'}
      href="/plan"
      onOpen={open}
      loading={pending && target === '/plan'}
      anyPending={pending}
    >
      {plan.preview.length ? (
        <ul className="space-y-2">
          {plan.preview.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: e.category ? categoryColor(e.category) : 'var(--vos-color-muted)',
                }}
                aria-hidden
              />
              <span className="text-ink truncate text-sm">{e.title}</span>
              <span className="text-muted/70 ml-auto shrink-0 font-sans text-[11px]">
                {fmtDay(e.date)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Nothing scheduled yet — build your day-by-day.</Empty>
      )}
    </Card>,

    <Card
      key="roadtrips"
      color={COLORS.roadtrips}
      icon={Route}
      label="Roadtrips"
      meta={
        roadtrips.total ? `${roadtrips.total} ${roadtrips.total === 1 ? 'route' : 'routes'}` : 'Empty'
      }
      href="/roadtrips"
      onOpen={open}
      loading={pending && target === '/roadtrips'}
      anyPending={pending}
    >
      {roadtrips.preview.length ? (
        <ul className="space-y-2">
          {roadtrips.preview.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Route className="text-muted/50 size-3.5 shrink-0" aria-hidden />
              <span className="text-ink truncate text-sm">{r.name}</span>
              <span className="text-muted/70 ml-auto shrink-0 font-sans text-[11px]">
                {r.stopCount} {r.stopCount === 1 ? 'stop' : 'stops'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No routes yet — chain places into a road trip.</Empty>
      )}
    </Card>,

    <Card
      key="pack"
      color={COLORS.pack}
      icon={Luggage}
      label="Pack"
      meta={packing.total ? `${packing.packed}/${packing.total} packed` : 'Empty'}
      href="/pack"
      onOpen={open}
      loading={pending && target === '/pack'}
      anyPending={pending}
    >
      {packing.total ? (
        <div className="space-y-2.5">
          <div className="rounded-pill bg-ink/[0.06] h-1.5 w-full overflow-hidden">
            <div
              className="rounded-pill h-full transition-all"
              style={{ width: `${packPct}%`, backgroundColor: COLORS.pack }}
            />
          </div>
          <p className="text-muted font-sans text-xs">
            {packPct}% packed
            {packing.essentialsLeft > 0 && (
              <span className="text-danger">
                {' '}
                · {packing.essentialsLeft} essential{packing.essentialsLeft === 1 ? '' : 's'} left
              </span>
            )}
          </p>
        </div>
      ) : (
        <Empty>Build your kit — nothing on the list yet.</Empty>
      )}
    </Card>,

    <Card
      key="budget"
      color={COLORS.budget}
      icon={Wallet}
      label="Budget"
      meta={spend.total ? formatMoney(spend.total, currency) : 'Empty'}
      href="/budget"
      onOpen={open}
      loading={pending && target === '/budget'}
      anyPending={pending}
    >
      {spend.total ? (
        <div className="space-y-3">
          {budget != null && (
            <div className="space-y-1.5">
              <div className="rounded-pill bg-ink/[0.06] h-1.5 w-full overflow-hidden">
                <div
                  className="rounded-pill h-full transition-all"
                  style={{
                    width: `${budgetPct}%`,
                    backgroundColor: overBudget ? 'var(--vos-color-danger)' : COLORS.budget,
                  }}
                />
              </div>
              <p className={cn('font-sans text-xs', overBudget ? 'text-danger' : 'text-muted')}>
                {budgetPct}% of {formatMoney(budget, currency)}
                {overBudget ? ' · over budget' : ''}
              </p>
            </div>
          )}
          <ul className="space-y-1.5">
            {spend.byCategory.map((c) => (
              <li key={c.category} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getExpenseCategory(c.category).color }}
                  aria-hidden
                />
                <span className="text-ink truncate">{getExpenseCategory(c.category).label}</span>
                <span className="text-muted ml-auto shrink-0 font-sans text-xs">
                  {formatMoney(c.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Empty>No expenses logged yet.</Empty>
      )}
    </Card>,

    <Card
      key="checklist"
      color={COLORS.checklist}
      icon={ListChecks}
      label="Checklist"
      meta={checklist.total ? `${checklist.done}/${checklist.total} done` : 'Empty'}
      href="/checklist"
      onOpen={open}
      loading={pending && target === '/checklist'}
      anyPending={pending}
    >
      {checklist.open.length ? (
        <ul className="space-y-2">
          {checklist.open.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span
                className="border-muted/40 size-3.5 shrink-0 rounded-[4px] border"
                aria-hidden
              />
              <span className="text-ink truncate text-sm">{t.label}</span>
              {t.dueDate && (
                <span className="text-muted/70 ml-auto shrink-0 font-sans text-[11px]">
                  {fmtDay(t.dueDate)}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{checklist.total ? 'All done — nice.' : 'No to-dos yet.'}</Empty>
      )}
    </Card>,

    <Card
      key="docs"
      color={COLORS.docs}
      icon={FileText}
      label="Docs"
      meta={docs.total ? `${docs.total} ${docs.total === 1 ? 'file' : 'files'}` : 'Empty'}
      href="/docs"
      onOpen={open}
      loading={pending && target === '/docs'}
      anyPending={pending}
    >
      {docs.preview.length ? (
        <ul className="space-y-2">
          {docs.preview.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <FileText className="text-muted/50 size-3.5 shrink-0" aria-hidden />
              <span className="text-ink truncate text-sm">{d.fileName}</span>
              <span className="text-muted/70 ml-auto shrink-0 font-sans text-[11px]">
                {DOC_LABEL[d.kind] ?? 'File'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No documents — add bookings, tickets, IDs.</Empty>
      )}
    </Card>,
  ];

  // Explicit two-column layout for sm+ (cards keep natural height). Mobile uses one column in
  // the array's natural order.
  const pick = (keys: string[]) => cards.filter((c) => keys.includes(c.key as string));
  const leftCol = pick(['explore', 'plan', 'budget']);
  const rightCol = pick(['roadtrips', 'pack', 'checklist', 'docs']);

  return (
    <div className="space-y-4">
      {/* Map — full width, on top */}
      <Card
        color={COLORS.map}
        icon={MapIcon}
        label="Map"
        meta={map.points.length ? `${map.points.length} located` : 'No pins yet'}
        href="/map"
        onOpen={open}
        loading={pending && target === '/map'}
        anyPending={pending}
        className="w-full"
      >
        <div className="border-border bg-canvas h-44 w-full overflow-hidden rounded-md border">
          {map.points.length ? (
            <MiniMap base={base} points={map.points} />
          ) : (
            <div className="text-muted flex h-full items-center justify-center text-sm">
              Add located places to see them on the map.
            </div>
          )}
        </div>
      </Card>

      {/* Mobile: single column in reading order */}
      <div className="flex flex-col gap-4 sm:hidden">{cards}</div>

      {/* sm+: two vertical masonry columns (cards keep natural height). min-w-0 lets the
          columns shrink instead of overflowing the viewport at narrow widths. */}
      <div className="hidden items-start gap-4 sm:flex">
        <div className="flex min-w-0 flex-1 flex-col gap-4">{leftCol}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">{rightCol}</div>
      </div>
    </div>
  );
}

function Card({
  color,
  icon: Icon,
  label,
  meta,
  href,
  onOpen,
  loading,
  anyPending,
  children,
  className,
}: {
  color: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  href: string;
  onOpen: (href: string) => void;
  loading: boolean;
  anyPending: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(href)}
      disabled={anyPending}
      style={{ '--c': color } as React.CSSProperties}
      className={cn(
        'group border-border bg-surface shadow-card relative flex flex-col rounded-lg border p-5 text-left transition-all duration-200',
        'hover:shadow-lift hover:z-10 hover:scale-[1.01]',
        'hover:border-[color-mix(in_srgb,var(--c)_45%,var(--vos-color-border))]',
        'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--c)_60%,transparent)] focus-visible:outline-none',
        'disabled:cursor-default disabled:opacity-100',
        className,
      )}
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--c)_15%,transparent)] text-[var(--c)]">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-ink block text-sm font-semibold">{label}</span>
          <span className="text-muted/70 block truncate font-sans text-[11px]">{meta}</span>
        </div>
        {loading ? (
          <Loader2 className="text-muted size-4 shrink-0 animate-spin" aria-hidden />
        ) : (
          <ArrowRight
            className="text-muted/40 size-4 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--c)]"
            aria-hidden
          />
        )}
      </div>
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted/70 font-sans text-xs">{children}</p>;
}
