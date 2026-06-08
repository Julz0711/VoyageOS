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
      className={cn(
        'group animate-fade-up border-border bg-surface shadow-card relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-all duration-200',
        'hover:shadow-lift hover:z-10 hover:scale-[1.02]',
        'hover:border-[color-mix(in_srgb,var(--c)_45%,var(--vos-color-border))] hover:bg-[color-mix(in_srgb,var(--c)_5%,var(--vos-color-surface))]',
        'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--c)_55%,transparent)] focus-visible:outline-none',
      )}
      style={
        { animationDelay: `${Math.min(index, 8) * 40}ms`, '--c': color } as React.CSSProperties
      }
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow text-muted flex min-w-0 items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="truncate">
              {category.label}
              {band ? ` · ${bandLabel[band] ?? band}` : ''}
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-1">
            {item.dontMiss && <Star className="fill-accent text-accent size-3.5" aria-hidden />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id, !item.isFavorite);
              }}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
              className="text-muted hover:text-danger -m-1 p-1 transition-colors"
            >
              <Heart
                className={cn('size-[18px]', item.isFavorite && 'fill-danger text-danger')}
                aria-hidden
              />
            </button>
          </span>
        </div>

        <h3 className="font-heading text-ink mt-1.5 line-clamp-1 text-base font-semibold">
          {item.title}
        </h3>
        {item.subtitle && (
          <p className="text-ink/70 mt-0.5 line-clamp-2 text-sm">{item.subtitle}</p>
        )}

        <div className="text-muted mt-3 flex items-center gap-3 overflow-hidden font-sans text-[11px]">
          <span className="text-muted/70 shrink-0">Nº{String(index + 1).padStart(2, '0')}</span>
          {item.distanceFromBase?.minutes != null && (
            <span className="shrink-0">
              {String(item.distanceFromBase.minutes).padStart(2, '0')} MIN
            </span>
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
