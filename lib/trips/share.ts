import 'server-only';
import { format } from 'date-fns';
import { connectToDatabase } from '@/lib/db/connect';
import { Trip } from '@/models/Trip';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getExploreItems } from '@/lib/explore/queries';
import {
  getTripForecast,
  getClimateForWindow,
  type ForecastDay,
  type ClimateSummary,
} from '@/lib/weather/openMeteo';
import { tripDays } from '@/lib/dates';
import type { ExploreItemDTO, PlanEntryDTO } from '@/lib/dto';

export interface SharedTrip {
  name: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  baseLabel: string;
  coverImage?: string;
  entries: PlanEntryDTO[];
  items: ExploreItemDTO[];
  forecast: ForecastDay[];
  climate: ClimateSummary | null;
}

/**
 * Loads a trip for the PUBLIC read-only share page by its share token. No auth, no user data:
 * returns only itinerary content (and never the token, owner id, or other trips).
 */
export async function getSharedTrip(token: string): Promise<SharedTrip | null> {
  if (!token || token.length < 8) return null;
  await connectToDatabase();
  const trip = await Trip.findOne({ shareToken: token })
    .select('name destination dateStart dateEnd baseLocation coverImage userId')
    .lean();
  if (!trip) return null;

  const userId = trip.userId.toString();
  const tripId = trip._id.toString();
  const dateStart = new Date(trip.dateStart).toISOString();
  const dateEnd = new Date(trip.dateEnd).toISOString();
  const { lat, lng } = trip.baseLocation;

  const [entries, items] = await Promise.all([
    getPlanEntries(userId, tripId),
    getExploreItems(userId, tripId),
  ]);

  // Weather is best-effort — never block the itinerary on it.
  let forecast: ForecastDay[] = [];
  try {
    forecast = (await getTripForecast(lat, lng, dateStart, dateEnd)).days;
  } catch {
    forecast = [];
  }
  const covered = new Set(forecast.map((f) => f.date));
  const hasGaps = tripDays(dateStart, dateEnd).some((d) => !covered.has(format(d, 'yyyy-MM-dd')));
  let climate: ClimateSummary | null = null;
  if (hasGaps) {
    try {
      climate = await getClimateForWindow(lat, lng, dateStart, dateEnd);
    } catch {
      climate = null;
    }
  }

  return {
    name: trip.name,
    destination: trip.destination,
    dateStart,
    dateEnd,
    baseLabel: trip.baseLocation.label,
    coverImage: trip.coverImage,
    entries,
    items,
    forecast,
    climate,
  };
}
