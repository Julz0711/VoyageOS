import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  Bike,
  Car,
  Castle,
  Info,
  Landmark,
  Mountain,
  Sailboat,
  ShoppingBag,
  Sunrise,
  Telescope,
  Trees,
  UtensilsCrossed,
  Waves,
  Wine,
  Zap,
} from 'lucide-react';

/**
 * Categories are DATA, not hardcoded UI. Add a category here and it flows through Explore
 * filters, cards, and the map legend. Colors reference theme CSS variables (from
 * config/theme.ts via the `--vos-*` namespace), so they restyle with the theme.
 */

/** Map clusters mirror the prototype legend. */
export type MapGroup = 'swim' | 'hike' | 'culture' | 'food';

export const mapGroups: Record<MapGroup, { label: string; color: string }> = {
  swim: { label: 'Swim & water', color: 'var(--vos-color-map-swim)' },
  hike: { label: 'Hike · climb · view', color: 'var(--vos-color-map-hike)' },
  culture: { label: 'Culture', color: 'var(--vos-color-map-culture)' },
  food: { label: 'Food & trips', color: 'var(--vos-color-map-food)' },
};

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  mapGroup: MapGroup;
}

export const categories = {
  'day-trip': { id: 'day-trip', label: 'Day trip', icon: Sunrise, mapGroup: 'food' },
  'road-trip': { id: 'road-trip', label: 'Road trip', icon: Car, mapGroup: 'food' },
  restaurant: { id: 'restaurant', label: 'Food & drink', icon: UtensilsCrossed, mapGroup: 'food' },
  culture: { id: 'culture', label: 'Culture', icon: Landmark, mapGroup: 'culture' },
  swim: { id: 'swim', label: 'Swim', icon: Waves, mapGroup: 'swim' },
  hike: { id: 'hike', label: 'Hike', icon: Mountain, mapGroup: 'hike' },
  viewpoint: { id: 'viewpoint', label: 'Viewpoint', icon: Telescope, mapGroup: 'hike' },
  'on-the-water': { id: 'on-the-water', label: 'On the water', icon: Sailboat, mapGroup: 'swim' },
  activity: { id: 'activity', label: 'Activity', icon: Zap, mapGroup: 'hike' },
  bike: { id: 'bike', label: 'Bike', icon: Bike, mapGroup: 'hike' },
  history: { id: 'history', label: 'History', icon: Castle, mapGroup: 'culture' },
  accommodation: { id: 'accommodation', label: 'Stay', icon: BedDouble, mapGroup: 'culture' },
  shopping: { id: 'shopping', label: 'Shopping', icon: ShoppingBag, mapGroup: 'food' },
  nightlife: { id: 'nightlife', label: 'Nightlife', icon: Wine, mapGroup: 'food' },
  nature: { id: 'nature', label: 'Nature', icon: Trees, mapGroup: 'hike' },
  practical: { id: 'practical', label: 'Practical', icon: Info, mapGroup: 'culture' },
} as const satisfies Record<string, CategoryDef>;

export type CategoryId = keyof typeof categories;

export const categoryIds = Object.keys(categories) as CategoryId[];

export function getCategory(id: string): CategoryDef {
  return (categories as Record<string, CategoryDef>)[id] ?? categories.practical;
}

/** The theme color (CSS var) for a category, derived from its map group. */
export function categoryColor(id: string): string {
  return mapGroups[getCategory(id).mapGroup].color;
}
