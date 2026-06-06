import { requireActiveTrip } from '@/lib/trips/active';
import { getPlanEntries } from '@/lib/calendar/queries';
import { buildIcs } from '@/lib/ics';

export const runtime = 'nodejs';

/** Exports the active trip's plan as an .ics calendar (auth + active-trip scoped). */
export async function GET() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return new Response('No active trip', { status: 400 });

  const entries = await getPlanEntries(userId, trip.id);
  const ics = buildIcs(
    trip.name,
    entries.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      startTime: e.startTime,
      durationMinutes: e.durationMinutes,
    })),
  );

  const safeName = trip.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'trip';
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
