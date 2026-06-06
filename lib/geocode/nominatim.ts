import 'server-only';

/**
 * Forward geocoding via Nominatim (OpenStreetMap, free, no key). Returns the top hit's
 * coordinates + resolved display name, or null. Cached for a day; be a good citizen with a UA.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '1', addressdetails: '0' });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'VoyageOS/1.0 (trip planner)' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const top = json[0];
    if (!top) return null;
    return { lat: Number(top.lat), lng: Number(top.lon), label: top.display_name };
  } catch {
    return null;
  }
}
