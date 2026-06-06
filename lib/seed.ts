import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { User } from '@/models/User';
import { Trip } from '@/models/Trip';
import { ExploreItem, type IExploreItem } from '@/models/ExploreItem';
import { PackingItem } from '@/models/PackingItem';
import { seedPackingItems, seasonForDate } from '@/config/packing';

/**
 * Seeds a starter trip (Nissedal) for a brand-new user, so the app has data to browse on first
 * run. Runs ONCE per user (tracked by `user.hasSeeded`) — deleting all trips later does NOT
 * re-seed.
 */

type SeedItem = Omit<IExploreItem, 'tripId' | 'userId'>;

const NISSEDAL_BASE = { lat: 59.0205, lng: 8.5183, label: 'Utsjå · Treungen' };

const seedItems: SeedItem[] = [
  {
    title: 'Lake Nisser beaches',
    category: 'swim',
    subtitle: 'Sandy coves a stroll from the cabin.',
    location: { lat: 59.025, lng: 8.52, areaLabel: 'Treungen' },
    distanceFromBase: { minutes: 8, band: 'doorstep' },
    tags: ['wild swim', 'family'],
    weatherFit: ['fine'],
    dontMiss: true,
    isFavorite: true,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Café Utsikten',
    category: 'restaurant',
    subtitle: 'Waffles and coffee with a lake view.',
    location: { lat: 59.03, lng: 8.51, areaLabel: 'Treungen' },
    distanceFromBase: { minutes: 12, band: '≤15' },
    tags: ['coffee', 'cake'],
    weatherFit: ['any', 'wet'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Jettegrytene potholes',
    category: 'on-the-water',
    subtitle: 'Glacial rock pools — bring water shoes.',
    location: { lat: 59.08, lng: 8.46, areaLabel: 'Nissedal' },
    distanceFromBase: { minutes: 25, band: '≤45' },
    tags: ['geology', 'swim'],
    weatherFit: ['fine'],
    dontMiss: true,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Hægefjell viewpoint',
    category: 'viewpoint',
    subtitle: 'Big granite slab, bigger views.',
    location: { lat: 59.11, lng: 8.5, areaLabel: 'Nissedal' },
    distanceFromBase: { minutes: 35, band: '≤45' },
    tags: ['panorama', 'sunset'],
    weatherFit: ['fine'],
    dontMiss: false,
    isFavorite: true,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Fjone forest loop',
    category: 'hike',
    subtitle: 'Easy 6 km loop through pine and lake shore.',
    location: { lat: 59.06, lng: 8.55, areaLabel: 'Fjone' },
    distanceFromBase: { minutes: 18, band: '≤45' },
    tags: ['easy', 'forest'],
    weatherFit: ['any'],
    dontMiss: false,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
  {
    title: 'Telemark Canal day trip',
    category: 'day-trip',
    subtitle: 'Historic locks and a slow boat north.',
    location: { lat: 59.4, lng: 9.0, areaLabel: 'Telemark' },
    distanceFromBase: { minutes: 90, band: 'daytrip' },
    tags: ['history', 'boat'],
    weatherFit: ['any'],
    dontMiss: true,
    isFavorite: false,
    externalLinks: [],
    source: 'manual',
    images: [],
  },
];

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

  const dateStart = new Date('2026-07-10T00:00:00.000Z');
  const dateEnd = new Date('2026-07-20T00:00:00.000Z');
  const categories = Array.from(new Set(seedItems.map((i) => i.category)));

  const trip = await Trip.create({
    userId,
    name: '10 days in Nissedal',
    destination: 'Nissedal, Norway',
    dateStart,
    dateEnd,
    baseLocation: NISSEDAL_BASE,
    categories,
    archived: false,
  });

  await ExploreItem.insertMany(
    seedItems.map((item) => ({ ...item, tripId: trip._id, userId })),
  );

  const packing = seedPackingItems(categories, seasonForDate(dateStart));
  await PackingItem.insertMany(
    packing.map((p, index) => ({
      tripId: trip._id,
      userId,
      category: p.group,
      label: p.label,
      essential: p.essential ?? false,
      quantityHint: p.quantityHint,
      packed: false,
      order: index,
    })),
  );
}
