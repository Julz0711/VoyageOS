'use client';

import { useState } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { Download, Loader2, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import type { TripRecap } from '@/lib/trips/recap';
import type { RecapMeta, RecapPhotoImage } from '@/components/trips/RecapPdf';
import { categoryColor, getCategory } from '@/config/categories';
import {
  formatMoney,
  expensePhaseIds,
  getExpensePhase,
  getExpenseCategory,
} from '@/config/expenses';
import { wmoInfo, wmoColor } from '@/lib/weather/wmo';
import {
  RECAP_SECTION_LABEL,
  DEFAULT_RECAP_ORDER,
  type RecapSectionKey,
} from '@/config/recap';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { MiniMap } from '@/components/trips/MiniMap';
import { cn } from '@/lib/utils';

/** Loads a photo (same-origin stream, no canvas taint), downscales it, returns a JPEG data URL. */
function photoToDataUrl(id: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const max = 1100;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = `/api/photos/${id}?inline=1`;
  });
}

type SectionState = { key: RecapSectionKey; enabled: boolean };

export function TripRecapView({ recap, meta }: { recap: TripRecap; meta: RecapMeta }) {
  const [busy, setBusy] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [sections, setSections] = useState<SectionState[]>(() =>
    DEFAULT_RECAP_ORDER.map((key) => ({ key, enabled: true })),
  );

  const enabledKeys = sections.filter((s) => s.enabled).map((s) => s.key);

  async function download() {
    setBusy(true);
    try {
      let photos: RecapPhotoImage[] = [];
      if (enabledKeys.includes('photos')) {
        const resolved = await Promise.all(
          recap.photos.slice(0, 12).map(async (p): Promise<RecapPhotoImage | null> => {
            const dataUrl = await photoToDataUrl(p.id);
            return dataUrl ? { dataUrl, label: p.placeTitle ?? p.caption ?? '' } : null;
          }),
        );
        photos = resolved.filter((x): x is RecapPhotoImage => x != null);
      }

      let mapImage: string | null = null;
      if (enabledKeys.includes('map') && recap.map.points.length > 0) {
        const { captureTripMap } = await import('@/components/trips/capture-map');
        mapImage = await captureTripMap(recap.map.base, recap.map.points);
      }

      const { downloadRecapPdf } = await import('@/components/trips/RecapPdf');
      await downloadRecapPdf(recap, meta, { photos, mapImage, sections: enabledKeys });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Headline + CTA */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted mb-1">Trip recap</p>
          <h1 className="font-display text-ink text-3xl leading-tight font-semibold md:text-4xl">
            {meta.name}
          </h1>
          <p className="text-muted mt-1.5 font-sans text-xs">
            {meta.destination} · {meta.dateRange} · {meta.dayCount} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setCustomizing(true)}>
            <SlidersHorizontal className="size-4" aria-hidden /> Customize
          </Button>
          <Button onClick={download} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {busy ? 'Building PDF…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {customizing && (
        <CustomizeModal
          sections={sections}
          onChange={setSections}
          onClose={() => setCustomizing(false)}
        />
      )}

      {enabledKeys.map((key) => (
        <RecapSection key={key} sectionKey={key} recap={recap} meta={meta} />
      ))}
    </div>
  );
}

function SectionHeading({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="eyebrow text-ink">{children}</h2>
      {count != null && <span className="text-muted num font-sans text-[11px]">{count}</span>}
      <hr className="atlas-rule flex-1" />
    </div>
  );
}

function RecapSection({
  sectionKey,
  recap,
  meta,
}: {
  sectionKey: RecapSectionKey;
  recap: TripRecap;
  meta: RecapMeta;
}) {
  const { stats, budgetByPhase, budgetByCategory, days, photos, items, roadtrips, map, forecast } =
    recap;

  switch (sectionKey) {
    case 'items':
      if (items.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading count={items.length}>Places</SectionHeading>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const def = getCategory(it.category);
              return (
                <div
                  key={it.id}
                  className="border-border bg-surface flex items-center gap-2.5 rounded-lg border p-2.5"
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${categoryColor(it.category)} 16%, transparent)`,
                      color: categoryColor(it.category),
                    }}
                  >
                    <def.icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-sm">{it.title}</span>
                    {it.areaLabel && (
                      <span className="text-muted block truncate font-sans text-[11px]">
                        {it.areaLabel}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'plan': {
      const plannedDays = days.filter((d) => d.entries.length > 0);
      if (plannedDays.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading>Day by day</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {plannedDays.map((d) => {
              const i = days.findIndex((x) => x.date === d.date);
              return (
                <div key={d.date} className="border-border bg-surface shadow-card rounded-lg border p-5">
                  <h3 className="font-heading text-ink text-base font-semibold">Day {i + 1}</h3>
                  <p className="text-muted mb-3 font-sans text-[11px]">
                    {format(parseISO(d.date), 'EEEE d MMM')}
                  </p>
                  <ul className="space-y-2">
                    {d.entries.map((e, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: e.category
                              ? categoryColor(e.category)
                              : 'var(--vos-color-muted)',
                          }}
                          aria-hidden
                        />
                        <span className="text-ink truncate text-sm">{e.title}</span>
                        {e.areaLabel && (
                          <span className="text-muted/70 ml-auto shrink-0 truncate font-sans text-[11px]">
                            {e.areaLabel}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case 'roadtrips':
      if (roadtrips.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading count={roadtrips.length}>Roadtrips</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {roadtrips.map((r) => (
              <div key={r.id} className="border-border bg-surface shadow-card rounded-lg border p-5">
                <h3 className="font-heading text-ink mb-2 text-base font-semibold">{r.name}</h3>
                <ul className="space-y-1.5">
                  {r.stops.map((st, j) => {
                    const def = getCategory(st.category);
                    return (
                      <li key={j} className="text-ink flex items-center gap-2 text-sm">
                        <def.icon className="text-muted size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{st.title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      );

    case 'map':
      if (map.points.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading count={map.points.length}>Map</SectionHeading>
          <div className="border-border bg-canvas h-72 w-full overflow-hidden rounded-lg border">
            <MiniMap base={map.base} points={map.points} />
          </div>
        </section>
      );

    case 'budget':
      if (stats.budgetTotal === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading>Spendings</SectionHeading>
          <div className="border-border bg-surface shadow-card rounded-lg border p-6">
            <p className="eyebrow text-muted">Total spent</p>
            <p className="num text-ink text-3xl font-semibold">
              {formatMoney(stats.budgetTotal, meta.currency)}
            </p>
            <div className="mt-5 space-y-2.5">
              {budgetByCategory.map((c) => {
                const def = getExpenseCategory(c.category);
                const pct = stats.budgetTotal > 0 ? Math.round((c.amount / stats.budgetTotal) * 100) : 0;
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${def.color} 16%, transparent)`,
                        color: def.color,
                      }}
                    >
                      <def.icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="text-ink w-28 shrink-0 truncate text-sm">{def.label}</span>
                    <span className="rounded-pill bg-canvas h-2 flex-1 overflow-hidden">
                      <span
                        className="rounded-pill block h-full"
                        style={{ width: `${pct}%`, backgroundColor: def.color }}
                      />
                    </span>
                    <span className="num text-muted w-24 shrink-0 text-right text-xs">
                      {formatMoney(c.amount, meta.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-border mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4">
              {expensePhaseIds.map((id) => {
                const def = getExpensePhase(id);
                return (
                  <span key={id} className="flex items-center gap-1.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: def.color }} aria-hidden />
                    <span className="text-muted">{def.short}</span>
                    <span className="num text-ink">{formatMoney(budgetByPhase[id], meta.currency)}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      );

    case 'forecast':
      if (forecast.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading>Weather</SectionHeading>
          <div className="no-scrollbar -mx-1.5 flex gap-2 overflow-x-auto px-1.5 py-1">
            {forecast.map((f) => {
              const Icon = wmoInfo(f.code).icon;
              return (
                <div
                  key={f.date}
                  className="border-border bg-surface flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-md border px-3 py-3 text-center"
                >
                  <span className="text-muted/70 font-sans text-[11px]">
                    {format(parseISO(f.date), 'd MMM')}
                  </span>
                  <Icon className="my-1 size-5" style={{ color: wmoColor(f.code) }} aria-hidden />
                  <span className="num text-sm">
                    <span className="text-ink">{f.tMax}°</span>{' '}
                    <span className="text-muted">{f.tMin}°</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      );

    case 'photos':
      if (photos.length === 0) return null;
      return (
        <section className="space-y-4">
          <SectionHeading count={photos.length}>Photos</SectionHeading>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="border-border bg-canvas relative aspect-square overflow-hidden rounded-lg border"
              >
                <Image
                  src={`/api/photos/${p.id}`}
                  alt={p.caption ?? ''}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  unoptimized
                  className="object-cover"
                />
                {(p.placeTitle || p.caption) && (
                  <span className="from-ink/70 absolute inset-x-0 bottom-0 truncate bg-gradient-to-t to-transparent p-2 font-sans text-[11px] text-white">
                    {p.placeTitle ?? p.caption}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      );
  }
}

function CustomizeModal({
  sections,
  onChange,
  onClose,
}: {
  sections: SectionState[];
  onChange: (next: SectionState[]) => void;
  onClose: () => void;
}) {
  function toggle(key: RecapSectionKey) {
    onChange(sections.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <Modal title="Customize recap" eyebrow="What’s in the report" onClose={onClose}>
      <div className="space-y-2 p-5">
        <p className="text-muted/80 mb-3 font-sans text-xs">
          Toggle sections on or off and reorder them — the preview and the PDF update to match.
        </p>
        <ul className="border-border divide-border divide-y rounded-lg border">
          {sections.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3 px-3 py-2.5">
              <label className="flex flex-1 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={() => toggle(s.key)}
                  className="size-4 accent-[var(--vos-color-primary)]"
                />
                <span className={cn('text-sm', s.enabled ? 'text-ink' : 'text-muted')}>
                  {RECAP_SECTION_LABEL[s.key]}
                </span>
              </label>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="text-muted hover:text-ink p-1 disabled:opacity-30"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === sections.length - 1}
                aria-label="Move down"
                className="text-muted hover:text-ink p-1 disabled:opacity-30"
              >
                <ArrowDown className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="border-border flex justify-end border-t pt-4">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
