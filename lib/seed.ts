import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { User } from '@/models/User';
import { Trip } from '@/models/Trip';
import { ExploreItem, type IExploreItem } from '@/models/ExploreItem';
import { PackingItem } from '@/models/PackingItem';
import { CalendarEntry } from '@/models/CalendarEntry';
import { ChecklistItem } from '@/models/ChecklistItem';
import { Roadtrip } from '@/models/Roadtrip';

/**
 * Seeds a ready-to-explore DEMO trip for a brand-new user so the app feels alive on first run:
 * a 1-week trip starting 30 days out, five activities (incl. a 2-stop roadtrip), a prefilled
 * plan, a compact packing list, and a couple of checklist items. Runs ONCE per user
 * (tracked by `user.hasSeeded`) — deleting trips later does NOT re-seed.
 */

type SeedItem = Omit<IExploreItem, 'tripId' | 'userId' | 'routeStopIds'>;

const BASE = { lat: 38.7128, lng: -9.13, label: 'Apartment · Alfama' };

// Order matters: indexes are reused below to wire the plan + roadtrip.
const ITEMS: SeedItem[] = [
  {
    title: 'Time Out Market',
    category: 'restaurant',
    subtitle: 'Lisbon’s best food hall under one roof.',
    location: { lat: 38.7067, lng: -9.1459, areaLabel: 'Cais do Sodré' },
    distanceFromBase: { minutes: 12, band: '≤15' },
    tags: ['food', 'tapas'],
    weatherFit: ['any', 'wet'],
    dontMiss: true,
    isFavorite: true,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Parque Eduardo VII',
    category: 'nature',
    subtitle: 'Hilltop park with a view straight down to the river.',
    location: { lat: 38.7287, lng: -9.15, areaLabel: 'Avenidas Novas' },
    distanceFromBase: { minutes: 15, band: '≤15' },
    tags: ['park', 'walk'],
    weatherFit: ['fine'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Museu Nacional do Azulejo',
    category: 'culture',
    subtitle: 'Five centuries of Portuguese tilework.',
    location: { lat: 38.7249, lng: -9.113, areaLabel: 'Beato' },
    distanceFromBase: { minutes: 18, band: '≤45' },
    tags: ['museum', 'art'],
    weatherFit: ['any', 'wet'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Thermal spa afternoon',
    category: 'activity',
    subtitle: 'Sauna, steam and a long soak to reset.',
    location: { lat: 38.717, lng: -9.139, areaLabel: 'Lisbon' },
    distanceFromBase: { minutes: 10, band: '≤15' },
    tags: ['spa', 'wellness', 'relax'],
    weatherFit: ['any', 'wet'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  // --- Roadtrip stops (indexes 4 & 5) ---
  {
    title: 'Pena Palace, Sintra',
    category: 'history',
    subtitle: 'A fairytale palace above the hills.',
    location: { lat: 38.7876, lng: -9.3905, areaLabel: 'Sintra' },
    distanceFromBase: { minutes: 50, band: 'daytrip' },
    tags: ['palace', 'views'],
    weatherFit: ['fine', 'any'],
    dontMiss: true,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Cabo da Roca',
    category: 'viewpoint',
    subtitle: 'The westernmost point of mainland Europe.',
    location: { lat: 38.7803, lng: -9.4989, areaLabel: 'Cascais' },
    distanceFromBase: { minutes: 65, band: 'daytrip' },
    tags: ['cliffs', 'sunset'],
    weatherFit: ['fine'],
    dontMiss: true,
    isFavorite: true,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
];

const PACKING: { group: string; label: string; essential?: boolean; quantityHint?: string }[] = [
  { group: 'Essentials', label: 'Passport / ID', essential: true },
  { group: 'Essentials', label: 'Phone + charger', essential: true },
  { group: 'Essentials', label: 'Cards & some cash', essential: true },
  { group: 'Clothing', label: 'Light layers', quantityHint: '4–5' },
  { group: 'Clothing', label: 'Comfortable walking shoes' },
  { group: 'Clothing', label: 'Swimwear' },
  { group: 'Day bag', label: 'Sunscreen' },
  { group: 'Day bag', label: 'Refillable water bottle' },
  { group: 'Day bag', label: 'EU power adapter' },
];

/** UTC midnight, `days` from today. */
function dayFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

/** UTC midnight, `n` days after `start`. */
function addDays(start: Date, n: number): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + n));
}

export async function seedTripForUser(userId: string): Promise<void> {
  await connectToDatabase();

  // Atomically claim the one-time seed so it never re-runs (even after deleting all trips).
  const claim = await User.findOneAndUpdate(
    { _id: userId, hasSeeded: { $ne: true } },
    { $set: { hasSeeded: true } },
  );
  if (!claim) return;

  // Safety for users that predate the flag: don't create a duplicate if they already have trips.
  const existing = await Trip.countDocuments({ userId });
  if (existing > 0) return;

  const dateStart = dayFromToday(7); // starts a week out
  const dateEnd = addDays(dateStart, 6); // 1 week (7 days inclusive)
  const categories = Array.from(new Set([...ITEMS.map((i) => i.category), 'road-trip']));

  const trip = await Trip.create({
    userId,
    name: 'Demo: A week in Lisbon',
    destination: 'Lisbon, Portugal',
    dateStart,
    dateEnd,
    baseLocation: BASE,
    categories,
    archived: false,
  });
  const tripId = trip._id;

  // Explore items (4 activities + 2 roadtrip stops).
  const created = await ExploreItem.insertMany(ITEMS.map((item) => ({ ...item, tripId, userId })));
  const [food, nature, museum, spa, stopA, stopB] = created;

  // Roadtrip = a mirror Explore card (category 'road-trip') + a Roadtrip record linking 2 stops.
  const roadtripMirror = await ExploreItem.create({
    tripId,
    userId,
    title: 'Sintra & Cascais loop',
    category: 'road-trip',
    subtitle: 'Roadtrip · 2 stops',
    description: 'A scenic day loop from the cabin: Pena Palace, then out to the cliffs at Cabo da Roca.',
    location: stopA.location,
    distanceFromBase: { band: 'daytrip' },
    tags: ['roadtrip'],
    weatherFit: ['any'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
    routeStopIds: [stopA._id, stopB._id],
  });

  await Roadtrip.create({
    tripId,
    userId,
    name: 'Sintra & Cascais loop',
    notes: 'Rent a car; allow a full day.',
    stopIds: [stopA._id, stopB._id],
    exploreItemId: roadtripMirror._id,
  });

  // Prefilled plan — day 1 (arrival) and day 7 (departure) kept free.
  await CalendarEntry.insertMany([
    { tripId, userId, date: addDays(dateStart, 0), note: 'Arrival', order: 0 },
    { tripId, userId, exploreItemId: museum._id, date: addDays(dateStart, 1), order: 0 },
    { tripId, userId, exploreItemId: nature._id, date: addDays(dateStart, 2), order: 0 },
    { tripId, userId, exploreItemId: roadtripMirror._id, date: addDays(dateStart, 3), order: 0 },
    { tripId, userId, exploreItemId: spa._id, date: addDays(dateStart, 4), order: 0 },
    { tripId, userId, exploreItemId: food._id, date: addDays(dateStart, 5), order: 0 },
    { tripId, userId, date: addDays(dateStart, 6), note: 'Departure', order: 0 },
  ]);

  // Compact packing list.
  await PackingItem.insertMany(
    PACKING.map((p, index) => ({
      tripId,
      userId,
      category: p.group,
      label: p.label,
      essential: p.essential ?? false,
      quantityHint: p.quantityHint,
      packed: false,
      order: index,
    })),
  );

  // A couple of pre-trip tasks.
  await ChecklistItem.insertMany([
    { tripId, userId, label: 'Check your passport is valid for the trip', dueDate: addDays(dateStart, -5), done: false, order: 0 },
    { tripId, userId, label: 'Reserve a rental car for the Sintra & Cascais loop', dueDate: addDays(dateStart, -3), done: false, order: 1 },
  ]);
}
