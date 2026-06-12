import 'server-only';
import { format } from 'date-fns';
import type { TripDTO } from '@/lib/dto';
import { getExploreItems } from '@/lib/explore/queries';
import { getRoadtrips } from '@/lib/roadtrips/queries';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getPackingItems } from '@/lib/packing/queries';
import { getExpenses } from '@/lib/budget/queries';
import { getPhotos } from '@/lib/photos/queries';
import { getTripForecast } from '@/lib/weather/openMeteo';
import { tripDays } from '@/lib/dates';
import { phaseForDate, type ExpensePhase } from '@/config/expenses';

export interface RecapDay {
  date: string;
  entries: { title: string; category?: string; areaLabel?: string }[];
}

export interface RecapPhoto {
  id: string;
  caption?: string;
  day?: string;
  placeTitle?: string;
}

export interface RecapItem {
  id: string;
  title: string;
  category: string;
  areaLabel?: string;
}

export interface RecapRoadtrip {
  id: string;
  name: string;
  stops: { title: string; category: string }[];
}

export interface RecapForecastDay {
  date: string;
  tMax: number;
  tMin: number;
  code: number;
}

export interface TripRecap {
  stats: {
    places: number;
    plannedEntries: number;
    plannedDays: number;
    photos: number;
    packed: number;
    packingTotal: number;
    budgetTotal: number;
  };
  budgetByPhase: Record<ExpensePhase, number>;
  /** Spend per expense category, highest first. */
  budgetByCategory: { category: string; amount: number }[];
  days: RecapDay[];
  photos: RecapPhoto[];
  items: RecapItem[];
  roadtrips: RecapRoadtrip[];
  map: { base: { lat: number; lng: number }; points: { id: string; lat: number; lng: number; category: string }[] };
  forecast: RecapForecastDay[];
}

/** Aggregates everything the trip recap (and its PDF) needs. */
export async function getTripRecap(userId: string, trip: TripDTO): Promise<TripRecap> {
  const [items, roadtrips, planEntries, packing, expenses, photos, forecast] = await Promise.all([
    getExploreItems(userId, trip.id),
    getRoadtrips(userId, trip.id),
    getPlanEntries(userId, trip.id),
    getPackingItems(userId, trip.id),
    getExpenses(userId, trip.id),
    getPhotos(userId, trip.id),
    getTripForecast(trip.baseLocation.lat, trip.baseLocation.lng, trip.dateStart, trip.dateEnd).then(
      (r) => r.days,
      () => [],
    ),
  ]);

  const titleById = new Map(items.map((i) => [i.id, i.title]));

  const byPhase: Record<ExpensePhase, number> = { pre: 0, during: 0, post: 0 };
  const byCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    const phase = (e.phase as ExpensePhase) || phaseForDate(e.date, trip.dateStart, trip.dateEnd);
    byPhase[phase] += e.amount;
    byCategoryMap.set(e.category, (byCategoryMap.get(e.category) ?? 0) + e.amount);
  }
  const budgetByCategory = [...byCategoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const days: RecapDay[] = tripDays(trip.dateStart, trip.dateEnd).map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    return {
      date: key,
      entries: planEntries
        .filter((e) => e.date === key)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.order - b.order)
        .map((e) => ({ title: e.title, category: e.category, areaLabel: e.areaLabel })),
    };
  });

  return {
    stats: {
      places: items.length,
      plannedEntries: planEntries.length,
      plannedDays: new Set(planEntries.map((e) => e.date)).size,
      photos: photos.length,
      packed: packing.filter((p) => p.packed).length,
      packingTotal: packing.length,
      budgetTotal: expenses.reduce((s, e) => s + e.amount, 0),
    },
    budgetByPhase: byPhase,
    budgetByCategory,
    days,
    photos: photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      day: p.day,
      placeTitle: p.linkedItemId ? titleById.get(p.linkedItemId) : undefined,
    })),
    items: items.map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      areaLabel: i.location?.areaLabel,
    })),
    roadtrips: roadtrips.map((r) => ({
      id: r.id,
      name: r.name,
      stops: r.stops.map((s) => ({ title: s.title, category: s.category })),
    })),
    map: {
      base: { lat: trip.baseLocation.lat, lng: trip.baseLocation.lng },
      points: items
        .filter((i) => i.location)
        .map((i) => ({ id: i.id, lat: i.location!.lat, lng: i.location!.lng, category: i.category })),
    },
    forecast: forecast.map((f) => ({ date: f.date, tMax: f.tMax, tMin: f.tMin, code: f.code })),
  };
}
