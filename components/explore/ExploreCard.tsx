'use client';

import { Heart, Star } from 'lucide-react';
import type { ExploreItemDTO } from '@/lib/dto';
import { getCategory, categoryColor } from '@/config/categories';
import { cn } from '@/lib/utils';

const bandLabel: Record<string, string> = {
  doorstep: 'DOORSTEP',
  '≤15': '≤15 MIN',
  '≤45': '≤45 MIN',
  daytrip: 'DAY TRIP',
};

export function ExploreCard({
  item,
  index,
  onSelect,
  onToggleFavorite,
}: {
  item: ExploreItemDTO;
  index: number;
  onSelect: (item: ExploreItemDTO) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
}) {
  const category = getCategory(item.category);
  const color = categoryColor(item.category);
  const band = item.distanceFromBase?.band;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className="group flex cursor-pointer animate-fade-up flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-shadow duration-200 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow flex min-w-0 items-center gap-1.5 text-muted">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="truncate">
              {category.label}
              {band ? ` · ${bandLabel[band] ?? band}` : ''}
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-1">
            {item.dontMiss && (
              <Star className="size-3.5 fill-accent text-accent" aria-hidden />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id, !item.isFavorite);
              }}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
              className="-m-1 p-1 text-muted transition-colors hover:text-danger"
            >
              <Heart className={cn('size-[18px]', item.isFavorite && 'fill-danger text-danger')} aria-hidden />
            </button>
          </span>
        </div>

        <h3 className="mt-1.5 line-clamp-1 font-display text-base font-semibold text-ink">{item.title}</h3>
        {item.subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-ink/70">{item.subtitle}</p>}

        <div className="mt-3 flex items-center gap-3 overflow-hidden font-mono text-[11px] text-muted">
          <span className="shrink-0 text-muted/70">Nº{String(index + 1).padStart(2, '0')}</span>
          {item.distanceFromBase?.minutes != null && (
            <span className="shrink-0">{String(item.distanceFromBase.minutes).padStart(2, '0')} MIN</span>
          )}
          {item.location && (
            <span className="truncate">
              {item.location.lat.toFixed(2)}, {item.location.lng.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
