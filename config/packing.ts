import type { CategoryId } from '@/config/categories';

/**
 * Seeded packing defaults. `seedPackingItems` builds a sensible starter list from the trip's
 * categories and season. Fully user-editable afterwards; the AI can add more (PRD §5.8).
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PackingSeed {
  group: string;
  label: string;
  essential?: boolean;
  quantityHint?: string;
}

/** Always included. */
const baseSeeds: PackingSeed[] = [
  { group: 'Essentials', label: 'Passport / ID', essential: true },
  { group: 'Essentials', label: 'Wallet & cards', essential: true },
  { group: 'Essentials', label: 'Phone + charger', essential: true },
  { group: 'Essentials', label: 'Travel documents / bookings', essential: true },
  { group: 'Essentials', label: 'Medication & first aid' },
  { group: 'Toiletries', label: 'Toothbrush & toothpaste', essential: true },
  { group: 'Toiletries', label: 'Deodorant' },
  { group: 'Toiletries', label: 'Sunscreen' },
  { group: 'Clothing', label: 'Underwear', quantityHint: 'per day + spare' },
  { group: 'Clothing', label: 'Socks', quantityHint: 'per day + spare' },
  { group: 'Clothing', label: 'T-shirts', quantityHint: '3–4' },
];

const seasonSeeds: Record<Season, PackingSeed[]> = {
  summer: [
    { group: 'Clothing', label: 'Shorts', quantityHint: '2–3' },
    { group: 'Clothing', label: 'Sunglasses' },
    { group: 'Clothing', label: 'Sun hat' },
    { group: 'Clothing', label: 'Light rain jacket' },
  ],
  spring: [
    { group: 'Clothing', label: 'Light layers' },
    { group: 'Clothing', label: 'Rain jacket', essential: true },
    { group: 'Clothing', label: 'Umbrella' },
  ],
  autumn: [
    { group: 'Clothing', label: 'Warm layers' },
    { group: 'Clothing', label: 'Rain jacket', essential: true },
    { group: 'Clothing', label: 'Beanie & gloves' },
  ],
  winter: [
    { group: 'Clothing', label: 'Insulated jacket', essential: true },
    { group: 'Clothing', label: 'Thermal base layers' },
    { group: 'Clothing', label: 'Beanie, gloves & scarf' },
    { group: 'Clothing', label: 'Warm waterproof boots' },
  ],
};

/** Activity-specific gear, keyed by category present on the trip. */
const categorySeeds: Partial<Record<CategoryId, PackingSeed[]>> = {
  hike: [
    { group: 'Outdoor & hiking', label: 'Hiking boots', essential: true },
    { group: 'Outdoor & hiking', label: 'Daypack' },
    { group: 'Outdoor & hiking', label: 'Refillable water bottle' },
  ],
  swim: [
    { group: 'On the water', label: 'Swimwear', essential: true },
    { group: 'On the water', label: 'Quick-dry towel' },
    { group: 'On the water', label: 'Water shoes' },
  ],
  'on-the-water': [
    { group: 'On the water', label: 'Dry bag' },
    { group: 'On the water', label: 'Waterproof phone pouch' },
  ],
  bike: [
    { group: 'Outdoor & hiking', label: 'Bike helmet', essential: true },
    { group: 'Outdoor & hiking', label: 'Padded shorts / gloves' },
  ],
  nature: [{ group: 'Outdoor & hiking', label: 'Insect repellent' }],
  viewpoint: [{ group: 'Outdoor & hiking', label: 'Camera / binoculars' }],
  culture: [{ group: 'Day bag', label: 'Reusable shopping / day bag' }],
};

/** Builds the de-duplicated seed list for a trip. */
export function seedPackingItems(
  tripCategories: readonly string[] = [],
  season: Season = 'summer',
): PackingSeed[] {
  const seeds: PackingSeed[] = [...baseSeeds, ...seasonSeeds[season]];
  const seen = new Set(seeds.map((s) => `${s.group}::${s.label}`));

  for (const cat of tripCategories) {
    const extra = categorySeeds[cat as CategoryId];
    if (!extra) continue;
    for (const seed of extra) {
      const key = `${seed.group}::${seed.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seeds.push(seed);
    }
  }
  return seeds;
}

/** Infers a season from a date (northern hemisphere). */
export function seasonForDate(date: Date): Season {
  const m = date.getMonth(); // 0-11
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}
