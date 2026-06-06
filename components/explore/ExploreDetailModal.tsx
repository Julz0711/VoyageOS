'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, X, Trash2, ExternalLink, MapPin } from 'lucide-react';
import type { ExploreItemDTO } from '@/lib/dto';
import { getCategory, categoryColor } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const bandLabel: Record<string, string> = {
  doorstep: 'On the doorstep',
  '≤15': '≤15 min away',
  '≤45': '≤45 min away',
  daytrip: 'Day trip',
};

const weatherLabel: Record<string, string> = {
  fine: 'Fine days',
  any: 'Any weather',
  wet: 'Wet days ok',
};

export function ExploreDetailModal({
  item,
  onClose,
  onToggleFavorite,
  onDelete,
}: {
  item: ExploreItemDTO;
  onClose: () => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [imageOk, setImageOk] = useState(true);
  const category = getCategory(item.category);
  const color = categoryColor(item.category);
  const Icon = category.icon;
  const band = item.distanceFromBase?.band;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        {item.images?.[0] && imageOk && (
          <div className="relative h-44 w-full shrink-0 bg-canvas">
            <Image
              src={item.images[0]}
              alt=""
              fill
              sizes="512px"
              className="object-cover"
              unoptimized
              onError={() => setImageOk(false)}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border p-5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-muted">
              {category.label}
              {band ? ` · ${bandLabel[band] ?? band}` : ''}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold leading-tight text-ink">
              {item.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id, !item.isFavorite)}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
              className="p-1.5 text-muted transition-colors hover:text-danger"
            >
              <Heart className={cn('size-5', item.isFavorite && 'fill-danger text-danger')} aria-hidden />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-muted hover:text-ink">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {(item.subtitle || item.description) && (
            <p className="leading-relaxed text-ink/80">{item.description || item.subtitle}</p>
          )}

          <dl className="grid grid-cols-2 gap-4">
            {item.distanceFromBase && (
              <Fact label="Distance">
                {bandLabel[item.distanceFromBase.band] ?? item.distanceFromBase.band}
                {item.distanceFromBase.minutes != null ? ` · ${item.distanceFromBase.minutes} min` : ''}
              </Fact>
            )}
            {item.location && (
              <Fact label="Coordinates">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden />
                  {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                </span>
              </Fact>
            )}
            {item.location?.areaLabel && <Fact label="Area">{item.location.areaLabel}</Fact>}
            <Fact label="Source">{item.source === 'ai' ? 'AI suggested' : item.source}</Fact>
          </dl>

          {item.weatherFit.length > 0 && (
            <div>
              <p className="eyebrow mb-1.5 text-muted">Good for</p>
              <div className="flex flex-wrap gap-1.5">
                {item.weatherFit.map((w) => (
                  <span
                    key={w}
                    className="rounded-pill border border-border px-2.5 py-0.5 text-xs text-ink"
                  >
                    {weatherLabel[w] ?? w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.tags.length > 0 && (
            <div>
              <p className="eyebrow mb-1.5 text-muted">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-pill bg-canvas px-2.5 py-0.5 font-mono text-xs text-muted">
                    #{tag.replace(/\s+/g, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.externalLinks.length > 0 && (
            <div className="space-y-1.5">
              {item.externalLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Footer: delete with confirm */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          {confirming ? (
            <>
              <span className="mr-auto text-sm text-muted">Delete this place?</span>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(item.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="eyebrow text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-ink">{children}</dd>
    </div>
  );
}
