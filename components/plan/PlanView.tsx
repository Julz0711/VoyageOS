'use client';

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { Plus, X, Sparkles, Trash2, Search, StickyNote } from 'lucide-react';
import type { TripDTO, ExploreItemDTO, PlanEntryDTO } from '@/lib/dto';
import type { ForecastDay, ForecastSource, ClimateSummary } from '@/lib/weather/openMeteo';
import { getCategory, categoryColor } from '@/config/categories';
import { tripDays, tripDayCount } from '@/lib/dates';
import {
  addToCalendar,
  removeCalendarEntry,
  clearPlan,
} from '@/lib/calendar/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WeatherPanel } from '@/components/weather/WeatherPanel';
import { ShareExportBar } from '@/components/plan/ShareExportBar';

type Action =
  | { type: 'add'; entry: PlanEntryDTO }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

function entriesForDay(list: PlanEntryDTO[], key: string): PlanEntryDTO[] {
  return list.filter((e) => e.date === key).sort((a, b) => a.order - b.order);
}

function reducer(entries: PlanEntryDTO[], action: Action): PlanEntryDTO[] {
  switch (action.type) {
    case 'add':
      return [...entries, action.entry];
    case 'remove':
      return entries.filter((e) => e.id !== action.id);
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
  const tempIdRef = useRef(0);

  const days = useMemo(() => tripDays(trip.dateStart, trip.dateEnd), [trip.dateStart, trip.dateEnd]);
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

  function clearAll() {
    startTransition(() => {
      apply({ type: 'clear' });
      void clearPlan();
    });
  }

  const hasEntries = optimistic.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow mb-1 text-muted">The itinerary</p>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Your {dayCount} days in {destinationShort}
          </h1>
          <p className="mt-1 text-sm text-muted">
            A loose rhythm — tap a day to add a place or note, the × to remove.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled title="AI itinerary suggestions arrive in Phase 3">
            <Sparkles className="size-4" aria-hidden /> Suggest plan
          </Button>
          <Button variant="secondary" onClick={clearAll} disabled={!hasEntries}>
            <Trash2 className="size-4" aria-hidden /> Clear
          </Button>
        </div>
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
          return (
            <section
              key={key}
              className="flex animate-fade-up flex-col rounded-lg border border-border bg-surface p-4 shadow-card"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">
                    Day {i + 1}
                  </h3>
                  <span className="font-mono text-[11px] text-muted">{format(day, 'EEE d MMM')}</span>
                </div>
                {dayEntries.length > 0 && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground">
                    {dayEntries.length}
                  </span>
                )}
              </div>

              <div className="mt-3 flex-1 space-y-2">
                {dayEntries.length === 0 ? (
                  <p className="py-4 text-sm italic text-muted/70">Open day</p>
                ) : (
                  dayEntries.map((entry) => <EntryRow key={entry.id} entry={entry} onRemove={remove} />)
                )}
              </div>

              <button
                type="button"
                onClick={() => setPickerDay({ key, label: `Day ${i + 1} · ${format(day, 'EEE d MMM')}` })}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-medium text-muted transition-colors hover:border-ink/25 hover:text-ink"
              >
                <Plus className="size-4" aria-hidden /> Add
              </button>
            </section>
          );
        })}
      </div>

      {pickerDay && (
        <DayPickerModal
          dayLabel={pickerDay.label}
          exploreItems={exploreItems}
          onPick={(item) => addItem(pickerDay.key, item)}
          onNote={(note) => addNote(pickerDay.key, note)}
          onClose={() => setPickerDay(null)}
        />
      )}
    </div>
  );
}

function EntryRow({ entry, onRemove }: { entry: PlanEntryDTO; onRemove: (id: string) => void }) {
  const color = entry.category ? categoryColor(entry.category) : 'var(--vos-color-muted)';
  const Icon = entry.category ? getCategory(entry.category).icon : StickyNote;
  const meta = [
    entry.startTime,
    entry.category ? getCategory(entry.category).label : undefined,
    entry.areaLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="group flex items-center gap-2.5 rounded-md bg-canvas/60 p-2">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{entry.title}</span>
        {meta && <span className="block truncate font-mono text-[11px] text-muted">{meta}</span>}
      </span>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label="Remove"
        className="shrink-0 p-1 text-muted/60 transition-colors hover:text-danger"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <span className="eyebrow text-muted">Add to</span>
            <h2 className="font-display text-lg font-semibold text-ink">{dayLabel}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
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
              <li className="px-1 py-2 text-sm text-muted">No matching places.</li>
            )}
            {filtered.map((item) => {
              const Icon = getCategory(item.category).icon;
              const color = categoryColor(item.category);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className="flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-canvas"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                      <span className="block truncate font-mono text-[11px] text-muted">
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
            className="flex gap-2 border-t border-border pt-3"
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
