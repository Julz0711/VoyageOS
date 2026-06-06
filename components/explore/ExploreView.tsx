'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { Plus, Heart } from 'lucide-react';
import type { ExploreItemDTO } from '@/lib/dto';
import { categories } from '@/config/categories';
import { toggleFavorite, deleteExploreItem } from '@/lib/explore/actions';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ExploreCard } from './ExploreCard';
import { ExploreDetailModal } from './ExploreDetailModal';
import { AddItemForm } from './AddItemForm';

type WeatherFilter = 'all' | 'fine' | 'wet' | 'surprise';
type DistanceFilter = 'all' | '≤15' | '≤45' | 'daytrip';

type OptimisticAction =
  | { type: 'favorite'; id: string; next: boolean }
  | { type: 'delete'; id: string };

function reducer(items: ExploreItemDTO[], action: OptimisticAction): ExploreItemDTO[] {
  switch (action.type) {
    case 'favorite':
      return items.map((i) => (i.id === action.id ? { ...i, isFavorite: action.next } : i));
    case 'delete':
      return items.filter((i) => i.id !== action.id);
  }
}

const distanceFilters: { value: DistanceFilter; label: string }[] = [
  { value: 'all', label: 'Anywhere' },
  { value: '≤15', label: '≤15 min' },
  { value: '≤45', label: '≤45 min' },
  { value: 'daytrip', label: 'Day trip' },
];

const weatherFilters: { value: WeatherFilter; label: string }[] = [
  { value: 'all', label: 'Any' },
  { value: 'fine', label: 'Fine day' },
  { value: 'wet', label: 'Wet day' },
  { value: 'surprise', label: 'Surprise us' },
];

function matchesDistance(item: ExploreItemDTO, filter: DistanceFilter): boolean {
  if (filter === 'all') return true;
  const band = item.distanceFromBase?.band;
  if (!band) return false;
  if (filter === '≤15') return band === 'doorstep' || band === '≤15';
  if (filter === '≤45') return band === 'doorstep' || band === '≤15' || band === '≤45';
  return band === 'daytrip';
}

function matchesWeather(item: ExploreItemDTO, filter: WeatherFilter): boolean {
  if (filter === 'all' || filter === 'surprise') return true;
  if (filter === 'fine') return item.weatherFit.includes('fine') || item.weatherFit.includes('any');
  return item.weatherFit.includes('wet') || item.weatherFit.includes('any');
}

export function ExploreView({ items }: { items: ExploreItemDTO[] }) {
  const [optimisticItems, applyOptimistic] = useOptimistic(items, reducer);
  const [, startTransition] = useTransition();

  const [category, setCategory] = useState<string>('all');
  const [distance, setDistance] = useState<DistanceFilter>('all');
  const [weather, setWeather] = useState<WeatherFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [surpriseIds, setSurpriseIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function onToggleFavorite(id: string, next: boolean) {
    startTransition(() => {
      applyOptimistic({ type: 'favorite', id, next });
      void toggleFavorite(id, next);
    });
  }

  function onDelete(id: string) {
    startTransition(() => {
      applyOptimistic({ type: 'delete', id });
      void deleteExploreItem(id);
    });
  }

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of optimisticItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [optimisticItems]);

  const baseFiltered = useMemo(
    () =>
      optimisticItems.filter(
        (item) =>
          (!favoritesOnly || item.isFavorite) &&
          (category === 'all' || item.category === category) &&
          matchesDistance(item, distance),
      ),
    [optimisticItems, favoritesOnly, category, distance],
  );

  const filtered = useMemo(() => {
    if (weather === 'surprise') {
      return baseFiltered.filter((item) => surpriseIds.includes(item.id));
    }
    return baseFiltered.filter((item) => matchesWeather(item, weather));
  }, [baseFiltered, weather, surpriseIds]);

  const orderIndex = useMemo(() => new Map(filtered.map((it, i) => [it.id, i])), [filtered]);
  const selectedItem = selectedId ? optimisticItems.find((i) => i.id === selectedId) ?? null : null;

  function rollSurprise() {
    const picked = [...baseFiltered]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .map((i) => i.id);
    setSurpriseIds(picked);
    setWeather('surprise');
  }

  const sections = useMemo(() => {
    const doorstep = filtered.filter(
      (i) => i.distanceFromBase?.band === 'doorstep' || i.distanceFromBase?.band === '≤15',
    );
    const further = filtered.filter((i) => !i.distanceFromBase || i.distanceFromBase.band === '≤45');
    const daytrips = filtered.filter((i) => i.distanceFromBase?.band === 'daytrip');
    return [
      { title: 'On your doorstep', items: doorstep },
      { title: 'Further afield', items: further },
      { title: 'Day trips', items: daytrips },
    ].filter((s) => s.items.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1 text-muted">The field guide</p>
          <h1 className="font-display text-3xl font-semibold text-ink">Explore</h1>
        </div>
        <Button onClick={() => setShowAdd((v) => !v)} variant={showAdd ? 'secondary' : 'primary'}>
          <Plus className="size-4" aria-hidden /> Add place
        </Button>
      </div>

      {showAdd && <AddItemForm onAdded={() => setShowAdd(false)} />}

      {/* Filters — labelled dropdowns; favorites stays a quick toggle */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All ({optimisticItems.length})</option>
            {Object.values(categories)
              .filter((c) => categoryCounts.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({categoryCounts.get(c.id)})
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Distance">
          <Select
            value={distance}
            onChange={(e) => setDistance(e.target.value as DistanceFilter)}
          >
            {distanceFilters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Show picks for">
          <Select
            value={weather}
            onChange={(e) => {
              const value = e.target.value as WeatherFilter;
              if (value === 'surprise') rollSurprise();
              else setWeather(value);
            }}
          >
            {weatherFilters.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>

        <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
          <Heart className={cn('size-3.5', favoritesOnly && 'fill-current')} aria-hidden /> Favorites
        </Chip>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/50 p-10 text-center text-muted">
          Nothing matches these filters yet.
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="eyebrow text-ink">{section.title}</h2>
              <span className="font-mono text-[11px] text-muted">
                {String(section.items.length).padStart(2, '0')}
              </span>
              <hr className="atlas-rule flex-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.items.map((item) => (
                <ExploreCard
                  key={item.id}
                  item={item}
                  index={orderIndex.get(item.id) ?? 0}
                  onSelect={(it) => setSelectedId(it.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {selectedItem && (
        <ExploreDetailModal
          item={selectedItem}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

/** A labelled filter control (eyebrow label stacked above the input). */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow text-muted">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-surface text-ink hover:border-ink/30',
      )}
    >
      {children}
    </button>
  );
}
