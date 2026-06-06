import { requireActiveTrip } from '@/lib/trips/active';
import { getClimateForWindow } from '@/lib/weather/openMeteo';

export const runtime = 'nodejs';

/** Lazy endpoint for the 30-day "typical conditions" tab — scoped to the active trip. */
export async function GET() {
  const { trip } = await requireActiveTrip();
  if (!trip) return new Response(null, { status: 404 });

  try {
    const summary = await getClimateForWindow(
      trip.baseLocation.lat,
      trip.baseLocation.lng,
      trip.dateStart,
      trip.dateEnd,
    );
    return Response.json(summary);
  } catch {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}
