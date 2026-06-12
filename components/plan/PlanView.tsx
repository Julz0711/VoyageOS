'use client';

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Plus, X, Trash2, Search, StickyNote, MapPin, Clock, Lock, LockOpen } from 'lucide-react';
import type { TripDTO, ExploreItemDTO, PlanEntryDTO } from '@/lib/dto';
import type { ForecastDay, ForecastSource, ClimateSummary } from '@/lib/weather/openMeteo';
import { getCategory, categoryColor } from '@/config/categories';
import { tripDays, tripDayCount } from '@/lib/dates';
import {
  addToCalendar,
  removeCalendarEntry,
  setCalendarEntryTime,
  clearPlan,
} from '@/lib/calendar/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { WeatherPanel } from '@/components/weather/WeatherPanel';
import { ShareExportBar } from '@/components/plan/ShareExportBar';
import { cn } from '@/lib/utils';

type Action =
  | { type: 'add'; entry: PlanEntryDTO }
  | { type: 'remove'; id: string }
  | { type: 'setTime'; id: string; startTime?: string }
  | { type: 'clear' };

/** Sort a day's entries by time (timed first, chronological), then manual order. */
function entriesForDay(list: PlanEntryDTO[], key: string): PlanEntryDTO[] {
  return list
    .filter((e) => e.date === key)
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime) return -1;
      if (b.startTime) return 1;
      return a.order - b.order;
    });
}

function reducer(entries: PlanEntryDTO[], action: Action): PlanEntryDTO[] {
  switch (action.type) {
    case 'add':
      return [...entries, action.entry];
    case 'remove':
      return entries.filter((e) => e.id !== action.id);
    case 'setTime':
      return entries.map((e) =>
        e.id === action.id ? { ...e, startTime: action.startTime || undefined } : e,
      );
    case 'clear':
      return [];
  }
}

export function PlanView({
  trip,
  entries,
  exploreItems,
  forecast,
  forecastSource,
  climate,
}: {
  trip: TripDTO;
  entries: PlanEntryDTO[];
  exploreItems: ExploreItemDTO[];
  forecast: ForecastDay[];
  forecastSource: ForecastSource | null;
  climate: ClimateSummary | null;
}) {
  const [optimistic, apply] = useOptimistic(entries, reducer);
  const [, startTransition] = useTransition();
  const [pickerDay, setPickerDay] = useState<{ key: string; label: string } | null>(null);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Past days auto-lock (read-only) so the trip recap reflects what actually happened; a day can
  // be temporarily unlocked to backfill or fix an entry.
  const [unlockedDays, setUnlockedDays] = useState<Set<string>>(() => new Set());
  const today = format(new Date(), 'yyyy-MM-dd');
  const tempIdRef = useRef(0);

  const days = useMemo(
    () => tripDays(trip.dateStart, trip.dateEnd),
    [trip.dateStart, trip.dateEnd],
  );
  const dayCount = tripDayCount(trip.dateStart, trip.dateEnd);
  const destinationShort = trip.destination.split(',')[0];

  function addItem(dayKey: string, item: ExploreItemDTO) {
    setPickerDay(null);
    const temp: PlanEntryDTO = {
      id: `temp-${(tempIdRef.current += 1)}`,
      tripId: trip.id,
      date: dayKey,
      order: 9999,
      exploreItemId: item.id,
      title: item.title,
      category: item.category,
      areaLabel: item.location?.areaLabel,
    };
    startTransition(() => {
      apply({ type: 'add', entry: temp });
      void addToCalendar({ date: dayKey, exploreItemId: item.id });
    });
  }

  function addNote(dayKey: string, note: string) {
    setPickerDay(null);
    const temp: PlanEntryDTO = {
      id: `temp-${(tempIdRef.current += 1)}`,
      tripId: trip.id,
      date: dayKey,
      order: 9999,
      note,
      title: note,
    };
    startTransition(() => {
      apply({ type: 'add', entry: temp });
      void addToCalendar({ date: dayKey, note });
    });
  }

  function remove(id: string) {
    startTransition(() => {
      apply({ type: 'remove', id });
      void removeCalendarEntry(id);
    });
  }

  function setTime(id: string, startTime: string) {
    startTransition(() => {
      apply({ type: 'setTime', id, startTime });
      void setCalendarEntryTime(id, startTime);
    });
  }

  function clearAll() {
    startTransition(() => {
      apply({ type: 'clear' });
      void clearPlan();
    });
  }

  const hasEntries = optimistic.length > 0;
  const openEntry = openEntryId ? (optimistic.find((e) => e.id === openEntryId) ?? null) : null;
  const openEntryItem = openEntry?.exploreItemId
    ? (exploreItems.find((i) => i.id === openEntry.exploreItemId) ?? null)
    : null;

  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <p className="eyebrow text-muted mb-1">The itinerary</p>
        <h1 className="font-display text-ink text-3xl font-semibold">
          Your {dayCount} days in {destinationShort}
        </h1>
        <p className="text-muted mt-1 text-sm">
          A loose rhythm — add places or notes to any day, then tap an entry to set a time or remove
          it.
        </p>
      </div>

      <ShareExportBar shareToken={trip.shareToken} />

      <WeatherPanel
        forecast={forecast}
        climate={climate}
        tripStart={trip.dateStart}
        tripEnd={trip.dateEnd}
        source={forecastSource}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day, i) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesForDay(optimistic, key);
          const locked = key < today && !unlockedDays.has(key);
          return (
            <section
              key={key}
              className={cn(
                'animate-fade-up border-border bg-surface shadow-card flex flex-col rounded-lg border p-4',
                locked && 'bg-canvas/40',
              )}
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading text-ink text-base font-semibold">Day {i + 1}</h3>
                  <span className="text-muted font-sans text-[11px]">
                    {format(day, 'EEE d MMM')}
                  </span>
                </div>
                {locked ? (
                  <span
                    className="text-muted/70 flex size-6 items-center justify-center"
                    title="Day complete"
                  >
                    <Lock className="size-3.5" aria-hidden />
                  </span>
                ) : (
                  dayEntries.length > 0 && (
                    <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full font-sans text-[11px]">
                      {dayEntries.length}
                    </span>
                  )
                )}
              </div>

              <div className="mt-3 flex-1 space-y-2">
                {dayEntries.length === 0 ? (
                  <p className="text-muted/70 py-4 text-sm italic">
                    {locked ? 'Nothing logged' : 'Open day'}
                  </p>
                ) : (
                  dayEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      locked={locked}
                      onSelect={() => setOpenEntryId(entry.id)}
                    />
                  ))
                )}
              </div>

              {locked ? (
                <button
                  type="button"
                  onClick={() => setUnlockedDays((s) => new Set(s).add(key))}
                  className="text-muted/70 hover:text-ink mt-3 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors"
                >
                  <LockOpen className="size-3.5" aria-hidden /> Day complete · Unlock to edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setPickerDay({ key, label: `Day ${i + 1} · ${format(day, 'EEE d MMM')}` })
                  }
                  className="border-border text-muted hover:border-ink/25 hover:text-ink mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="size-4" aria-hidden /> Add
                </button>
              )}
            </section>
          );
        })}
      </div>

      {hasEntries && (
        <div className="border-border flex justify-center border-t pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            className="text-muted hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden /> Clear entire plan
          </Button>
        </div>
      )}

      {confirmClear && (
        <Modal title="Clear the plan?" eyebrow="Start over" onClose={() => setConfirmClear(false)}>
          <div className="space-y-4 p-5">
            <p className="text-muted text-sm leading-relaxed">
              This removes every entry from all {dayCount} days. Your saved places stay in Explore —
              only the day-by-day plan is cleared. This can’t be undone.
            </p>
            <div className="border-border flex justify-end gap-2 border-t pt-4">
              <Button variant="secondary" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
              >
                <Trash2 className="size-4" aria-hidden /> Clear plan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pickerDay && (
        <DayPickerModal
          dayLabel={pickerDay.label}
          exploreItems={exploreItems}
          onPick={(item) => addItem(pickerDay.key, item)}
          onNote={(note) => addNote(pickerDay.key, note)}
          onClose={() => setPickerDay(null)}
        />
      )}

      {openEntry && (
        <PlanEntryModal
          entry={openEntry}
          item={openEntryItem}
          onSetTime={setTime}
          onRemove={(id) => {
            remove(id);
            setOpenEntryId(null);
          }}
          onClose={() => setOpenEntryId(null)}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  locked,
  onSelect,
}: {
  entry: PlanEntryDTO;
  locked?: boolean;
  onSelect: () => void;
}) {
  const color = entry.category ? categoryColor(entry.category) : 'var(--vos-color-muted)';
  const Icon = entry.category ? getCategory(entry.category).icon : StickyNote;
  const meta = [
    entry.startTime,
    entry.category ? getCategory(entry.category).label : undefined,
    entry.areaLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const inner = (
    <>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-sm font-medium">{entry.title}</span>
        {meta && <span className="text-muted block truncate font-sans text-[11px]">{meta}</span>}
      </span>
    </>
  );

  // Locked (past) days are read-only — render a static row, not a button.
  if (locked) {
    return (
      <div className="bg-canvas/40 flex w-full items-center gap-2.5 rounded-md p-2">{inner}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="bg-canvas/60 hover:bg-canvas flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors"
    >
      {inner}
    </button>
  );
}

function DayPickerModal({
  dayLabel,
  exploreItems,
  onPick,
  onNote,
  onClose,
}: {
  dayLabel: string;
  exploreItems: ExploreItemDTO[];
  onPick: (item: ExploreItemDTO) => void;
  onNote: (note: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const filtered = exploreItems.filter((i) =>
    i.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

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
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <span className="eyebrow text-muted">Add to</span>
            <h2 className="font-heading text-ink text-lg font-semibold">{dayLabel}</h2>
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

        <div className="space-y-3 p-5">
          <div className="relative">
            <Search
              className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your places…"
              className="pl-9"
              autoFocus
            />
          </div>

          <ul className="max-h-64 space-y-0.5 overflow-auto">
            {filtered.length === 0 && (
              <li className="text-muted px-1 py-2 text-sm">No matching places.</li>
            )}
            {filtered.map((item) => {
              const Icon = getCategory(item.category).icon;
              const color = categoryColor(item.category);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="hover:bg-canvas flex w-full items-center gap-2.5 rounded-md p-2 text-left"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
                        color,
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="text-muted block truncate font-sans text-[11px]">
                        {getCategory(item.category).label}
                        {item.location?.areaLabel ? ` · ${item.location.areaLabel}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) onNote(note.trim());
            }}
            className="border-border flex gap-2 border-t pt-3"
          >
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="…or add a free note"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={!note.trim()}>
              Add note
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

const bandLabel: Record<string, string> = {
  doorstep: 'On the doorstep',
  '≤15': '≤15 min away',
  '≤45': '≤45 min away',
  daytrip: 'Day trip',
};

function PlanEntryModal({
  entry,
  item,
  onSetTime,
  onRemove,
  onClose,
}: {
  entry: PlanEntryDTO;
  item: ExploreItemDTO | null;
  onSetTime: (id: string, time: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const color = entry.category ? categoryColor(entry.category) : 'var(--vos-color-muted)';
  const Icon = entry.category ? getCategory(entry.category).icon : StickyNote;
  const dayLabel = format(new Date(`${entry.date}T00:00:00`), 'EEEE d MMM');
  const description = item?.description || item?.subtitle;

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
        aria-label={entry.title}
      >
        {/* Header */}
        <div className="border-border flex items-start gap-3 border-b p-5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-muted">
              {entry.category ? getCategory(entry.category).label : 'Note'} · {dayLabel}
            </p>
            <h2 className="font-heading text-ink mt-0.5 text-xl leading-tight font-semibold">
              {entry.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink p-1.5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {description && <p className="text-ink/80 leading-relaxed">{description}</p>}

          <div>
            <label htmlFor="entry-time" className="eyebrow text-muted mb-1 block">
              <Clock className="mr-1 inline size-3" aria-hidden /> Start time (optional)
            </label>
            <Input
              id="entry-time"
              type="time"
              value={entry.startTime ?? ''}
              onChange={(e) => onSetTime(entry.id, e.target.value)}
              className="w-40"
            />
          </div>

          {item && (
            <dl className="grid grid-cols-2 gap-3">
              {item.distanceFromBase && (
                <Fact label="Distance">
                  {bandLabel[item.distanceFromBase.band] ?? item.distanceFromBase.band}
                  {item.distanceFromBase.minutes != null
                    ? ` · ${item.distanceFromBase.minutes} min`
                    : ''}
                </Fact>
              )}
              {item.location?.areaLabel && <Fact label="Area">{item.location.areaLabel}</Fact>}
              {item.location && (
                <Fact label="Coordinates">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    {item.location.lat.toFixed(3)}, {item.location.lng.toFixed(3)}
                  </span>
                </Fact>
              )}
            </dl>
          )}
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end border-t p-4">
          <Button variant="ghost" size="sm" onClick={() => onRemove(entry.id)}>
            <Trash2 className="size-4" aria-hidden /> Remove from plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="text-ink mt-0.5 font-sans text-sm">{children}</dd>
    </div>
  );
}
