import type { DistanceBand, WeatherFit, ItemSource } from '@/models/ExploreItem';
import type { DocumentKind } from '@/models/Document';

/** Client-facing shapes (ids and dates as strings). Produced via `serializeDoc`. */

export interface TripDTO {
  id: string;
  name: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  baseLocation: { lat: number; lng: number; label: string };
  coverImage?: string;
  categories: string[];
  currency?: string;
  budget?: number;
  phaseBudgets?: { pre?: number; during?: number; post?: number };
  shareToken?: string;
  archived: boolean;
}

export interface ExpenseDTO {
  id: string;
  tripId: string;
  amount: number;
  category: string;
  label: string;
  date: string; // YYYY-MM-DD
  phase: string; // 'pre' | 'during' | 'post'
}

export interface ChecklistItemDTO {
  id: string;
  tripId: string;
  label: string;
  done: boolean;
  dueDate?: string; // YYYY-MM-DD
  order: number;
}

export interface ExploreItemDTO {
  id: string;
  tripId: string;
  title: string;
  category: string;
  subtitle?: string;
  description?: string;
  location?: { lat: number; lng: number; address?: string; areaLabel?: string };
  distanceFromBase?: { minutes?: number; km?: number; band: DistanceBand };
  tags: string[];
  weatherFit: WeatherFit[];
  dontMiss: boolean;
  isFavorite: boolean;
  externalLinks: { label: string; url: string }[];
  source: ItemSource;
  images: string[];
  /** For road-trip items: ordered Explore item ids that make up the route. */
  routeStopIds?: string[];
  /** ISO timestamp; used for "recently added" sorting. */
  createdAt?: string;
}

export interface RoadtripStopDTO {
  id: string;
  title: string;
  category: string;
  lat?: number;
  lng?: number;
  areaLabel?: string;
}

export interface RoadtripDTO {
  id: string;
  tripId: string;
  name: string;
  notes?: string;
  exploreItemId?: string;
  stops: RoadtripStopDTO[];
}

export interface PackingItemDTO {
  id: string;
  tripId: string;
  category: string;
  label: string;
  packed: boolean;
  essential?: boolean;
  quantityHint?: string;
  order: number;
}

export interface CalendarEntryDTO {
  id: string;
  tripId: string;
  exploreItemId?: string;
  date: string;
  startTime?: string;
  durationMinutes?: number;
  note?: string;
  order: number;
}

/** A calendar entry enriched with its linked Explore item's display fields. */
export interface PlanEntryDTO {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  durationMinutes?: number;
  note?: string;
  order: number;
  exploreItemId?: string;
  title: string; // from the explore item, or the free-form note
  category?: string; // present when linked to an explore item
  areaLabel?: string;
}

export interface DocumentDTO {
  id: string;
  tripId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
  linkedItemId?: string;
  notes?: string;
}

export interface PhotoDTO {
  id: string;
  tripId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string;
  linkedItemId?: string;
  day?: string; // YYYY-MM-DD
  createdAt: string; // ISO
}
