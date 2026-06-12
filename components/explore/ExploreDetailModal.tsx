'use client';

import { useActionState, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  X,
  Trash2,
  ExternalLink,
  MapPin,
  Pencil,
  LocateFixed,
  Loader2,
  Route,
} from 'lucide-react';
import type { ExploreItemDTO } from '@/lib/dto';
import { updateExploreItemFields, geocodePlace, type EditItemState } from '@/lib/explore/actions';
import { getCategory, categoryColor, categories } from '@/config/categories';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

type RouteStop = { id: string; title: string; category: string };

export function ExploreDetailModal({
  item,
  routeStops,
  onClose,
  onToggleFavorite,
  onDelete,
}: {
  item: ExploreItemDTO;
  routeStops?: RouteStop[];
  onClose: () => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [imageOk, setImageOk] = useState(true);
  const [editing, setEditing] = useState(false);
  const category = getCategory(item.category);
  const color = categoryColor(item.category);
  const Icon = category.icon;
  const isRoadtrip = (item.routeStopIds?.length ?? 0) > 0;

  return (
    <div
      className="bg-ink/30 fixed inset-0 z-50 flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="border-border bg-surface shadow-lift flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
      >
        {!editing && item.images?.[0] && imageOk && (
          <div className="bg-canvas relative h-44 w-full shrink-0">
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
        <div className="border-border flex items-start gap-3 border-b p-5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {/* Distance is shown in the body's “Distance” fact, so keep the eyebrow to just the
                category here — avoids an awkward two-line wrap next to the action icons on mobile. */}
            <p className="eyebrow text-muted">{category.label}</p>
            <h2 className="font-heading text-ink mt-0.5 text-xl leading-tight font-semibold">
              {item.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit"
                className="text-muted hover:text-ink p-1.5 transition-colors"
              >
                <Pencil className="size-[18px]" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id, !item.isFavorite)}
              aria-pressed={item.isFavorite}
              aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
              className="text-muted hover:text-danger p-1.5 transition-colors"
            >
              <Heart
                className={cn('size-5', item.isFavorite && 'fill-danger text-danger')}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-muted hover:text-ink p-1.5"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {editing ? (
          <EditForm
            item={item}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              onClose();
            }}
          />
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {(item.subtitle || item.description) && (
                <p className="text-ink/80 leading-relaxed">{item.description || item.subtitle}</p>
              )}

              {isRoadtrip && routeStops && routeStops.length > 0 && (
                <div>
                  <p className="eyebrow text-muted mb-1.5 flex items-center gap-1.5">
                    <Route className="size-3.5" aria-hidden /> Route · {routeStops.length} stops
                  </p>
                  <ol className="space-y-1">
                    {routeStops.map((s, i) => {
                      const SIcon = getCategory(s.category).icon;
                      return (
                        <li key={s.id} className="text-ink flex items-center gap-2 text-sm">
                          <span className="text-muted font-sans text-[11px]">{i + 1}</span>
                          <SIcon className="text-muted size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{s.title}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-4">
                {item.distanceFromBase && (
                  <Fact label="Distance">
                    {bandLabel[item.distanceFromBase.band] ?? item.distanceFromBase.band}
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
                  <p className="eyebrow text-muted mb-1.5">Good for</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.weatherFit.map((w) => (
                      <span
                        key={w}
                        className="rounded-pill border-border text-ink border px-2.5 py-0.5 text-xs"
                      >
                        {weatherLabel[w] ?? w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.tags.length > 0 && (
                <div>
                  <p className="eyebrow text-muted mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-pill bg-canvas text-muted px-2.5 py-0.5 font-sans text-xs"
                      >
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
                      className="text-ink inline-flex items-center gap-1.5 text-sm font-medium underline"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: delete with confirm */}
            <div className="border-border flex items-center justify-end gap-2 border-t p-4">
              {confirming ? (
                <>
                  <span className="text-muted mr-auto text-sm">Delete this place?</span>
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
          </>
        )}
      </div>
    </div>
  );
}

function EditForm({
  item,
  onCancel,
  onSaved,
}: {
  item: ExploreItemDTO;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const action = updateExploreItemFields.bind(null, item.id);
  const [state, formAction, pending] = useActionState<EditItemState, FormData>(action, undefined);

  const [lat, setLat] = useState(item.location?.lat?.toString() ?? '');
  const [lng, setLng] = useState(item.location?.lng?.toString() ?? '');
  const [areaLabel, setAreaLabel] = useState(item.location?.areaLabel ?? '');
  const [title, setTitle] = useState(item.title);
  const [detecting, setDetecting] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // The action revalidates the page; close the modal once the save succeeds.
  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  async function detect() {
    setGeoMsg(null);
    const q = [title, areaLabel].filter(Boolean).join(', ').trim();
    if (!q) return setGeoMsg('Add a title or area first.');
    setDetecting(true);
    const res = await geocodePlace(q);
    setDetecting(false);
    if (res.ok) {
      setLat(res.lat.toFixed(5));
      setLng(res.lng.toFixed(5));
      setGeoMsg(`Found: ${res.label}`);
    } else {
      setGeoMsg(res.error);
    }
  }

  return (
    <form action={formAction} className="flex-1 space-y-4 overflow-y-auto p-5">
      <div>
        <Label htmlFor="e-title">Title</Label>
        <Input
          id="e-title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="e-category">Category</Label>
          <Select id="e-category" name="category" defaultValue={item.category} className="w-full">
            {Object.values(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="e-band">Distance</Label>
          <Select
            id="e-band"
            name="band"
            defaultValue={item.distanceFromBase?.band ?? ''}
            className="w-full"
          >
            <option value="">—</option>
            {Object.entries(bandLabel).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="e-subtitle">Subtitle</Label>
        <Input
          id="e-subtitle"
          name="subtitle"
          defaultValue={item.subtitle ?? ''}
          placeholder="One-line hook"
        />
      </div>

      <div>
        <Label htmlFor="e-description">Notes / description</Label>
        <textarea
          id="e-description"
          name="description"
          defaultValue={item.description ?? ''}
          rows={3}
          className="border-border bg-surface text-ink placeholder:text-muted focus-visible:ring-primary/40 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          placeholder="Anything worth remembering — opening hours, tips, why it's here…"
        />
      </div>

      {/* Location */}
      <div className="border-border bg-canvas/40 rounded-md border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-muted">Location</span>
          <Button type="button" variant="secondary" size="sm" onClick={detect} disabled={detecting}>
            {detecting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <LocateFixed className="size-4" aria-hidden />
            )}
            {detecting ? 'Finding…' : 'Auto-detect'}
          </Button>
        </div>
        <div className="mt-2">
          <Label htmlFor="e-area">Area label</Label>
          <Input
            id="e-area"
            name="areaLabel"
            value={areaLabel}
            onChange={(e) => setAreaLabel(e.target.value)}
            placeholder="e.g. Alfama, Lisbon"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="e-lat">Latitude</Label>
            <Input
              id="e-lat"
              name="lat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="38.7139"
            />
          </div>
          <div>
            <Label htmlFor="e-lng">Longitude</Label>
            <Input
              id="e-lng"
              name="lng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-9.1331"
            />
          </div>
        </div>
        {geoMsg && <p className="text-muted mt-2 text-xs">{geoMsg}</p>}
      </div>

      <div>
        <Label htmlFor="e-tags">Tags (comma-separated)</Label>
        <Input
          id="e-tags"
          name="tags"
          defaultValue={item.tags.join(', ')}
          placeholder="swim, family, scenic"
        />
      </div>

      <div>
        <span className="eyebrow text-muted mb-1.5 block">Good for</span>
        <div className="flex flex-wrap gap-3">
          {(['fine', 'any', 'wet'] as const).map((w) => (
            <label key={w} className="text-ink flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="weatherFit"
                value={w}
                defaultChecked={item.weatherFit.includes(w)}
                className="size-4 accent-[var(--vos-color-primary)]"
              />
              {weatherLabel[w]}
            </label>
          ))}
        </div>
      </div>

      <label className="text-ink flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="dontMiss"
          defaultChecked={item.dontMiss}
          className="size-4 accent-[var(--vos-color-primary)]"
        />
        Mark as “don’t miss”
      </label>

      {state?.error && <p className="text-danger text-sm">{state.error}</p>}

      <div className="border-border flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
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
