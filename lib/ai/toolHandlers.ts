import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ExploreItem } from '@/models/ExploreItem';
import { PackingItem } from '@/models/PackingItem';
import { CalendarEntry } from '@/models/CalendarEntry';
import { Trip } from '@/models/Trip';
import { getForecast } from '@/lib/weather/openMeteo';
import { findImage } from '@/lib/images/openverse';
import { aiLimits } from '@/config/ai';

/**
 * Server-side tool handlers. Each is scoped to the session user + active trip and tagged
 * `source:'ai'` for created records. These are the trusted boundary — the model proposes,
 * these decide. Reused by the AI SDK tools and unit tests.
 */

export interface ExploreItemInput {
  title: string;
  category: string;
  subtitle?: string;
  description?: string;
  location?: { lat: number; lng: number; address?: string; areaLabel?: string };
  distanceFromBase?: { minutes?: number; band: 'doorstep' | '≤15' | '≤45' | 'daytrip' };
  tags?: string[];
  weatherFit?: ('fine' | 'any' | 'wet')[];
  dontMiss?: boolean;
}

/** Builds an image query from the item and fetches a representative photo (best-effort). */
async function imagesFor(input: ExploreItemInput): Promise<string[]> {
  const parts = [input.title, input.location?.areaLabel].filter(Boolean);
  const url = await findImage(parts.join(' '));
  return url ? [url] : [];
}

export async function addExploreItem(userId: string, tripId: string, input: ExploreItemInput) {
  await connectToDatabase();
  const images = await imagesFor(input);
  const doc = await ExploreItem.create({
    tripId,
    userId,
    title: input.title,
    category: input.category,
    subtitle: input.subtitle,
    description: input.description,
    location: input.location,
    distanceFromBase: input.distanceFromBase,
    tags: input.tags ?? [],
    weatherFit: input.weatherFit ?? ['any'],
    dontMiss: input.dontMiss ?? false,
    images,
    source: 'ai',
  });
  return { id: doc._id.toString(), title: doc.title };
}

export async function addExploreItems(userId: string, tripId: string, items: ExploreItemInput[]) {
  const capped = items.slice(0, aiLimits.maxBatchSize);
  // Parallel: each item also fetches an image, so don't serialize.
  const created = await Promise.all(capped.map((item) => addExploreItem(userId, tripId, item)));
  return { created: created.length, items: created };
}

export async function updateExploreItem(
  userId: string,
  tripId: string,
  id: string,
  patch: Partial<ExploreItemInput>,
) {
  if (!isValidObjectId(id)) throw new Error('Invalid item id');
  await connectToDatabase();
  const res = await ExploreItem.updateOne({ _id: id, userId, tripId }, { $set: patch });
  if (res.matchedCount === 0) throw new Error('Item not found');
  return { id, updated: true };
}

export async function toggleFavorite(userId: string, tripId: string, id: string, isFavorite: boolean) {
  if (!isValidObjectId(id)) throw new Error('Invalid item id');
  await connectToDatabase();
  const res = await ExploreItem.updateOne({ _id: id, userId, tripId }, { $set: { isFavorite } });
  if (res.matchedCount === 0) throw new Error('Item not found');
  return { id, isFavorite };
}

export interface CalendarInput {
  date: string; // YYYY-MM-DD
  exploreItemId?: string;
  note?: string;
  startTime?: string;
  durationMinutes?: number;
}

export async function addToCalendar(userId: string, tripId: string, input: CalendarInput) {
  await connectToDatabase();
  if (input.exploreItemId) {
    if (!isValidObjectId(input.exploreItemId)) throw new Error('Invalid item id');
    const owned = await ExploreItem.exists({ _id: input.exploreItemId, userId, tripId });
    if (!owned) throw new Error('Item not found');
  }
  const date = new Date(`${input.date}T00:00:00.000Z`);
  const last = await CalendarEntry.findOne({ userId, tripId, date }).sort({ order: -1 }).lean();
  const order = (last?.order ?? -1) + 1;
  const doc = await CalendarEntry.create({
    tripId,
    userId,
    exploreItemId: input.exploreItemId,
    date,
    startTime: input.startTime,
    durationMinutes: input.durationMinutes,
    note: input.exploreItemId ? undefined : input.note,
    order,
  });
  return { id: doc._id.toString(), date: input.date };
}

export async function addPackingItem(
  userId: string,
  tripId: string,
  input: { category: string; label: string; quantityHint?: string },
) {
  await connectToDatabase();
  const last = await PackingItem.findOne({ userId, tripId }).sort({ order: -1 }).lean();
  const order = (last?.order ?? -1) + 1;
  const doc = await PackingItem.create({
    tripId,
    userId,
    category: input.category,
    label: input.label,
    quantityHint: input.quantityHint,
    packed: false,
    order,
  });
  return { id: doc._id.toString(), label: doc.label };
}

// ---- Read handlers ----

export async function getTripContext(userId: string, tripId: string) {
  await connectToDatabase();
  const [trip, items, plannedDates, packingTotal] = await Promise.all([
    Trip.findOne({ _id: tripId, userId }).lean(),
    ExploreItem.find({ userId, tripId }).select('title category distanceFromBase isFavorite').lean(),
    CalendarEntry.distinct('date', { userId, tripId }),
    PackingItem.countDocuments({ userId, tripId }),
  ]);
  if (!trip) throw new Error('Trip not found');
  return {
    name: trip.name,
    destination: trip.destination,
    dateStart: new Date(trip.dateStart).toISOString().slice(0, 10),
    dateEnd: new Date(trip.dateEnd).toISOString().slice(0, 10),
    base: trip.baseLocation,
    exploreItems: items.map((i) => ({
      // The id is REQUIRED for updateExploreItem / toggleFavorite / addToCalendar to target a
      // real record. Without it the model guesses and the write fails ("Item not found").
      id: i._id.toString(),
      title: i.title,
      category: i.category,
      band: i.distanceFromBase?.band,
      favorite: i.isFavorite,
    })),
    plannedDays: plannedDates.length,
    packingItems: packingTotal,
  };
}

export async function getWeather(userId: string, tripId: string, days: number) {
  await connectToDatabase();
  const trip = await Trip.findOne({ _id: tripId, userId }).select('baseLocation').lean();
  if (!trip) throw new Error('Trip not found');
  const forecast = await getForecast(trip.baseLocation.lat, trip.baseLocation.lng);
  return forecast.slice(0, Math.max(1, Math.min(days, 16))).map((d) => ({
    date: d.date,
    high: d.tMax,
    low: d.tMin,
    precipMm: d.precipSum,
    precipChance: d.precipProbMax,
    code: d.code,
  }));
}

export async function searchPlaces(query: string, nearBase: boolean, base?: { lat: number; lng: number }) {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '3', addressdetails: '0' });
  if (nearBase && base) {
    const d = 0.6; // ~60km box
    params.set('viewbox', `${base.lng - d},${base.lat + d},${base.lng + d},${base.lat - d}`);
    params.set('bounded', '0');
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'VoyageOS/1.0 (trip planner)' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { results: [], note: `Place search unavailable (${res.status}).` };
    const json = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return {
      results: json.slice(0, 3).map((r) => ({
        name: r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon),
      })),
    };
  } catch {
    return { results: [], note: 'Place search failed; you can add places without coordinates.' };
  }
}
