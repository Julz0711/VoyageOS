'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { Map as MlMap, Marker } from 'maplibre-gl';
import { SlidersHorizontal } from 'lucide-react';
import type { ExploreItemDTO, PlanEntryDTO, TripDTO } from '@/lib/dto';
import { getCategory, mapGroups, type MapGroup } from '@/config/categories';
import { theme } from '@/config/theme';
import { tripDays } from '@/lib/dates';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Resolve a `--vos-*` theme variable to a concrete color. MapLibre paint properties can't
 * read CSS custom properties (DOM marker/popup styles can), so layer colors must be literal.
 */
function cssColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

function dot(color: string, size: number, ring = false): HTMLDivElement {
  const el = document.createElement('div');
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '999px';
  el.style.background = color;
  el.style.border = ring ? '3px solid white' : '2px solid white';
  el.style.boxShadow = '0 1px 4px rgba(16,48,49,.4)';
  el.style.cursor = 'pointer';
  return el;
}

/** A numbered pin for day-route stops. */
function numberedDot(color: string, n: number): HTMLDivElement {
  const el = dot(color, 24);
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.color = 'white';
  el.style.fontSize = '12px';
  el.style.fontWeight = '700';
  el.style.fontFamily = 'var(--vos-font-sans)';
  el.textContent = String(n);
  return el;
}

function directionsHref(lat: number, lng: number, from?: { lat: number; lng: number }): string {
  const dest = `${lat},${lng}`;
  return from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${dest}`
    : `https://www.google.com/maps/search/?api=1&query=${dest}`;
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

export function MapView({
  trip,
  items,
  entries,
}: {
  trip: TripDTO;
  items: ExploreItemDTO[];
  entries: PlanEntryDTO[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [group, setGroup] = useState<MapGroup | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [dayKey, setDayKey] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const base = trip.baseLocation;
  const located = useMemo(() => items.filter((i) => i.location), [items]);
  const itemsById = useMemo(() => new Map(located.map((i) => [i.id, i])), [located]);
  const days = useMemo(
    () => tripDays(trip.dateStart, trip.dateEnd),
    [trip.dateStart, trip.dateEnd],
  );

  // Stops planned for the selected day, in itinerary order (located items only).
  const dayStops = useMemo(() => {
    if (dayKey === 'all') return [];
    return entries
      .filter((e) => e.date === dayKey && e.exploreItemId)
      .sort((a, b) => a.order - b.order)
      .map((e) => itemsById.get(e.exploreItemId!))
      .filter((i): i is ExploreItemDTO => Boolean(i));
  }, [dayKey, entries, itemsById]);

  const visible = useMemo(() => {
    if (dayKey !== 'all') return dayStops;
    return located.filter(
      (i) =>
        (!favoritesOnly || i.isFavorite) &&
        (group === 'all' || getCategory(i.category).mapGroup === group),
    );
  }, [dayKey, dayStops, located, group, favoritesOnly]);

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [base.lng, base.lat],
        zoom: 9,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      new maplibregl.Marker({ element: dot('var(--vos-color-primary)', 22, true) })
        .setLngLat([base.lng, base.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText(base.label))
        .addTo(map);

      map.on('load', () => {
        if (cancelled) return;
        map.addSource('day-route', { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'day-route-line',
          type: 'line',
          source: 'day-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': cssColor('--vos-color-accent', theme.colors.accent),
            'line-width': 3,
            'line-dasharray': [1.5, 1],
          },
        });
        mapRef.current = map;
        setReady(true);
      });
    }
    void init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers + day route whenever the visible set changes.
  useEffect(() => {
    let active = true;
    async function render() {
      const map = mapRef.current;
      if (!map || !ready) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (!active) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const dayMode = dayKey !== 'all';

      visible.forEach((item, idx) => {
        const color = mapGroups[getCategory(item.category).mapGroup].color;
        const el = dayMode ? numberedDot('var(--vos-color-accent)', idx + 1) : dot(color, 16);
        const popupHtml =
          `<strong style="font-family:var(--vos-font-heading);font-size:14px">${escapeHtml(item.title)}</strong>` +
          `<br/><span style="font-family:var(--vos-font-sans);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--vos-color-muted)">${escapeHtml(getCategory(item.category).label)}</span>` +
          `<br/><a href="${directionsHref(item.location!.lat, item.location!.lng, base)}" target="_blank" rel="noopener" style="color:var(--vos-color-accent)">Directions ↗</a>`;
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([item.location!.lng, item.location!.lat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(popupHtml))
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Day route line: base → stops in order (rough straight-line guide, not real routing).
      const source = map.getSource('day-route') as { setData: (d: unknown) => void } | undefined;
      if (source) {
        if (dayMode && dayStops.length > 0) {
          const coords = [
            [base.lng, base.lat],
            ...dayStops.map((i) => [i.location!.lng, i.location!.lat]),
          ];
          source.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: coords },
              },
            ],
          });
          // Fit to the day's points.
          let minLng = base.lng,
            minLat = base.lat,
            maxLng = base.lng,
            maxLat = base.lat;
          for (const [lng, lat] of coords) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
          }
          map.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: 64, maxZoom: 13, duration: 500 },
          );
        } else {
          source.setData(EMPTY_FC);
        }
      }
    }
    void render();
    return () => {
      active = false;
    };
  }, [visible, dayStops, dayKey, ready, base]);

  const dayMode = dayKey !== 'all';

  // Group + favorites only apply when viewing all places; a single day shows its ordered stops.
  const activeFilterCount = [dayMode, !dayMode && group !== 'all', !dayMode && favoritesOnly].filter(
    Boolean,
  ).length;

  const filterControls = (
    <>
      <Field label="Day">
        <Select value={dayKey} onChange={(e) => setDayKey(e.target.value)}>
          <option value="all">All places</option>
          {days.map((d, i) => (
            <option key={format(d, 'yyyy-MM-dd')} value={format(d, 'yyyy-MM-dd')}>
              Day {i + 1} · {format(d, 'EEE d MMM')}
            </option>
          ))}
        </Select>
      </Field>

      {!dayMode && (
        <Field label="Group">
          <Select value={group} onChange={(e) => setGroup(e.target.value as MapGroup | 'all')}>
            <option value="all">All groups</option>
            {(Object.keys(mapGroups) as MapGroup[]).map((g) => (
              <option key={g} value={g}>
                {mapGroups[g].label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {!dayMode && (
        <Field label="Show">
          <Select
            value={favoritesOnly ? 'fav' : 'all'}
            onChange={(e) => setFavoritesOnly(e.target.value === 'fav')}
          >
            <option value="all">All places</option>
            <option value="fav">Favorites only</option>
          </Select>
        </Field>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted mb-1">The territory</p>
          <h1 className="font-display text-3xl font-semibold">Map</h1>
        </div>
        {/* Mobile filter button */}
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={cn(
            'rounded-pill inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm transition-colors sm:hidden',
            activeFilterCount > 0
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-ink hover:border-ink/30',
          )}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary-foreground/20 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile filter modal */}
      {showFilters && (
        <Modal title="Filters" eyebrow="Map view" onClose={() => setShowFilters(false)}>
          <div className="space-y-4 p-5">
            {filterControls}
            <div className="border-border flex justify-end border-t pt-4">
              <Button onClick={() => setShowFilters(false)}>Show results</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Desktop filter bar */}
      <div className="hidden flex-wrap items-end gap-x-4 gap-y-3 sm:flex">{filterControls}</div>

      <div
        ref={containerRef}
        className="border-border h-[60vh] w-full overflow-hidden rounded-lg border"
        role="region"
        aria-label="Trip map"
      />
      <p className="text-muted text-xs">
        {dayMode
          ? dayStops.length > 0
            ? `${dayStops.length} planned ${dayStops.length === 1 ? 'stop' : 'stops'} this day, in order from your base.`
            : 'No located stops planned for this day yet.'
          : `Showing ${visible.length} of ${located.length} located places.`}
      </p>
    </div>
  );
}

/** A labelled filter control (eyebrow label stacked above the input) — mirrors Explore. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow text-muted">{label}</span>
      {children}
    </label>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
