import { format } from 'date-fns';
import { requireActiveTrip } from '@/lib/trips/active';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getExploreItems } from '@/lib/explore/queries';
import {
  getTripForecast,
  getClimateForWindow,
  type ForecastDay,
  type ForecastSource,
  type ClimateSummary,
} from '@/lib/weather/openMeteo';
import { tripDays } from '@/lib/dates';
import { PlanView } from '@/components/plan/PlanView';
import { NoActiveTrip } from '@/components/NoActiveTrip';

export const metadata = { title: 'Plan' };

export default async function PlanPage() {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return <NoActiveTrip />;

  const [entries, items] = await Promise.all([
    getPlanEntries(userId, trip.id),
    getExploreItems(userId, trip.id),
  ]);

  let forecast: ForecastDay[] = [];
  let forecastSource: ForecastSource | null = null;
  try {
    const result = await getTripForecast(
      trip.baseLocation.lat,
      trip.baseLocation.lng,
      trip.dateStart,
      trip.dateEnd,
    );
    forecast = result.days;
    forecastSource = result.source;
  } catch {
    forecast = [];
  }

  // If some trip days fall outside the forecast horizon, fetch seasonal averages for those days.
  const covered = new Set(forecast.map((f) => f.date));
  const hasGaps = tripDays(trip.dateStart, trip.dateEnd).some(
    (d) => !covered.has(format(d, 'yyyy-MM-dd')),
  );
  let climate: ClimateSummary | null = null;
  if (hasGaps) {
    try {
      climate = await getClimateForWindow(
        trip.baseLocation.lat,
        trip.baseLocation.lng,
        trip.dateStart,
        trip.dateEnd,
      );
    } catch {
      climate = null;
    }
  }

  return (
    <PlanView
      trip={trip}
      entries={entries}
      exploreItems={items}
      forecast={forecast}
      forecastSource={forecastSource}
      climate={climate}
    />
  );
}
