'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { mapGroups, getCategory } from '@/config/categories';

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
  el.style.border = ring ? '2.5px solid white' : '2px solid white';
  el.style.boxShadow = '0 1px 3px rgba(16,48,49,.4)';
  return el;
}

/** A numbered pin for ordered route stops. */
function numberedDot(color: string, n: number): HTMLDivElement {
  const el = dot(color, 20);
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.color = 'white';
  el.style.fontSize = '11px';
  el.style.fontWeight = '700';
  el.style.fontFamily = 'var(--vos-font-numeric)';
  el.textContent = String(n);
  return el;
}

/**
 * A small, non-interactive map preview. Shows the base + located places, auto-fit to bounds.
 * With `routeLine`, the points are treated as an ordered route — numbered, with a dashed loop
 * base → stops → base (used for road-trip previews).
 */
export function MiniMap({
  base,
  points,
  routeLine = false,
}: {
  base: { lat: number; lng: number };
  points: { id: string; lat: number; lng: number; category: string }[];
  routeLine?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let map: MlMap | null = null;

    async function init() {
      if (!containerRef.current) return;
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE,
        center: [base.lng, base.lat],
        zoom: 8,
        interactive: false,
        attributionControl: false,
      });

      new maplibregl.Marker({ element: dot('var(--vos-color-primary)', 16, true) })
        .setLngLat([base.lng, base.lat])
        .addTo(map);

      points.forEach((p, i) => {
        const el = routeLine
          ? numberedDot('var(--vos-color-accent2)', i + 1)
          : dot(mapGroups[getCategory(p.category).mapGroup].color, 11);
        new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map!);
      });

      // Dashed loop base → stops → base, drawn once the style is ready.
      if (routeLine && points.length > 0) {
        const coords = [
          [base.lng, base.lat],
          ...points.map((p) => [p.lng, p.lat]),
          [base.lng, base.lat],
        ];
        map.on('load', () => {
          if (cancelled || !map) return;
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: coords },
            },
          });
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': getComputedStyle(document.documentElement)
                .getPropertyValue('--vos-color-accent2')
                .trim(),
              'line-width': 2.5,
              'line-dasharray': [1.5, 1],
            },
          });
        });
      }

      // Fit to base + all points.
      let minLng = base.lng,
        minLat = base.lat,
        maxLng = base.lng,
        maxLat = base.lat;
      for (const p of points) {
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
      }
      if (points.length > 0) {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 36, maxZoom: 12, duration: 0 },
        );
      }
    }
    void init();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [base, points, routeLine]);

  return <div ref={containerRef} className="h-full w-full" aria-hidden />;
}
