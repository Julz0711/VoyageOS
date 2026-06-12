'use client';

import type { Map as MlMap } from 'maplibre-gl';
import { theme } from '@/config/theme';
import { getCategory } from '@/config/categories';

const GROUP_HEX: Record<string, string> = {
  swim: theme.colors.mapSwim,
  hike: theme.colors.mapHike,
  culture: theme.colors.mapCulture,
  food: theme.colors.mapFood,
};
function hexFor(category: string): string {
  return GROUP_HEX[getCategory(category).mapGroup] ?? theme.colors.muted;
}

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

/**
 * Renders an off-screen map of the trip's located places and returns a JPEG data URL — for
 * embedding in the recap PDF. Points are drawn as GL circle layers (not HTML markers) so they
 * survive `toDataURL`. Best-effort: returns null on any failure (caller degrades gracefully).
 */
export async function captureTripMap(
  base: { lat: number; lng: number },
  points: { lat: number; lng: number; category: string }[],
  { width = 760, height = 380 }: { width?: number; height?: number } = {},
): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
  });
  document.body.appendChild(container);

  let map: MlMap | null = null;
  try {
    const maplibregl = (await import('maplibre-gl')).default;
    // `preserveDrawingBuffer` is required to read the canvas back via toDataURL; it's a valid
    // runtime option but missing from the typings, so cast the options object.
    const options = {
      container,
      style: OSM_STYLE,
      center: [base.lng, base.lat] as [number, number],
      zoom: 8,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
    };
    map = new maplibregl.Map(options as ConstructorParameters<typeof maplibregl.Map>[0]);
    const m = map;

    await new Promise<void>((res) => m.on('load', () => res()));

    m.addSource('pts', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { color: theme.colors.primary, r: 7 }, geometry: { type: 'Point', coordinates: [base.lng, base.lat] } },
          ...points.map((p) => ({
            type: 'Feature' as const,
            properties: { color: hexFor(p.category), r: 5 },
            geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
          })),
        ],
      },
    });
    m.addLayer({
      id: 'pts',
      type: 'circle',
      source: 'pts',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['get', 'r'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    if (points.length > 0) {
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
      m.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 44, maxZoom: 11, duration: 0 },
      );
    }

    const capture = (): string | null => {
      try {
        return m.getCanvas().toDataURL('image/jpeg', 0.85);
      } catch {
        return null; // tainted canvas — shouldn't happen with CORS-enabled OSM tiles
      }
    };

    // Capture once all tiles for the view have loaded, with a hard timeout fallback.
    return await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(capture()), 3500);
      m.once('idle', () => {
        clearTimeout(timer);
        resolve(capture());
      });
    });
  } catch {
    return null;
  } finally {
    try {
      map?.remove();
    } catch {
      /* ignore */
    }
    container.remove();
  }
}
