import 'server-only';

/**
 * Finds a representative image for a place via Openverse (openverse.org) — free, no API key,
 * CC-licensed media. We use the Openverse-proxied `thumbnail` URL so all images come from a
 * single host (api.openverse.org), which keeps next/image config simple.
 *
 * Returns null on any failure so callers can fall back to the category icon.
 */
export async function findImage(query: string): Promise<string | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  const params = new URLSearchParams({
    q,
    page_size: '1',
    mature: 'false',
  });

  try {
    const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
      headers: { 'User-Agent': 'VoyageOS/1.0 (trip planner)' },
      next: { revalidate: 60 * 60 * 24 * 7 }, // a week
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: Array<{ thumbnail?: string; url?: string }> };
    const first = json.results?.[0];
    return first?.thumbnail ?? null;
  } catch {
    return null;
  }
}
