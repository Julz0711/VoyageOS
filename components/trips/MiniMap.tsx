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

/**
 * A small, non-interactive map preview for the trip summary. Shows the base + located
 * places, auto-fit to bounds. Interactions are disabled — the card links to the full map.
 */
export function MiniMap({
  base,
  points,
}: {
  base: { lat: number; lng: number };
  points: { id: string; lat: number; lng: number; category: string }[];
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

      for (const p of points) {
        const color = mapGroups[getCategory(p.category).mapGroup].color;
        new maplibregl.Marker({ element: dot(color, 11) }).setLngLat([p.lng, p.lat]).addTo(map);
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
          { padding: 40, maxZoom: 11, duration: 0 },
        );
      }
    }
    void init();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [base, points]);

  return <div ref={containerRef} className="h-full w-full" aria-hidden />;
}
