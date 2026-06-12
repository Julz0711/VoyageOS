import 'server-only';
import { getExploreItems } from '@/lib/explore/queries';
import { getRoadtrips } from '@/lib/roadtrips/queries';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getPackingItems } from '@/lib/packing/queries';
import { getExpenses } from '@/lib/budget/queries';
import { getChecklist } from '@/lib/checklist/queries';
import { getDocuments } from '@/lib/documents/queries';
import { getPhotos } from '@/lib/photos/queries';
import { phaseForDate, type ExpensePhase } from '@/config/expenses';
import type { DocumentKind } from '@/models/Document';

/** Pre-shaped, minimal data for the trip summary cards (see components/trips/TripSummary). */
export interface TripSummary {
  explore: {
    total: number;
    /** Up to 3 places to preview — favorites if any, else the first few added. */
    preview: { id: string; title: string; category: string; areaLabel?: string }[];
    isFallback: boolean;
  };
  roadtrips: {
    total: number;
    preview: { id: string; name: string; stopCount: number }[];
  };
  plan: {
    days: number;
    total: number;
    preview: { id: string; date: string; title: string; category?: string }[];
  };
  packing: { total: number; packed: number; essentialsLeft: number };
  budget: { total: number; byPhase: Record<ExpensePhase, number> };
  checklist: {
    total: number;
    done: number;
    open: { id: string; label: string; dueDate?: string }[];
  };
  docs: {
    total: number;
    preview: { id: string; fileName: string; kind: DocumentKind }[];
  };
  photos: {
    total: number;
    /** Up to 9 photo ids for a 3×3 thumbnail grid. */
    preview: string[];
  };
  map: {
    points: { id: string; lat: number; lng: number; category: string }[];
  };
}

/** Aggregates every section's data into one compact payload for the trip summary page. */
export async function getTripSummary(
  userId: string,
  tripId: string,
  tripStart: string,
  tripEnd: string,
): Promise<TripSummary> {
  const [items, roadtrips, planEntries, packing, expenses, checklist, docs, photos] =
    await Promise.all([
      getExploreItems(userId, tripId),
      getRoadtrips(userId, tripId),
      getPlanEntries(userId, tripId),
      getPackingItems(userId, tripId),
      getExpenses(userId, tripId),
      getChecklist(userId, tripId),
      getDocuments(userId, tripId),
      getPhotos(userId, tripId),
    ]);

  const favorites = items.filter((i) => i.isFavorite);
  const exploreSource = favorites.length > 0 ? favorites : items;

  // Spend grouped by phase (stored phase, or derived from the date for older expenses).
  const byPhase: Record<ExpensePhase, number> = { pre: 0, during: 0, post: 0 };
  for (const e of expenses) {
    const phase = (e.phase as ExpensePhase) || phaseForDate(e.date, tripStart, tripEnd);
    byPhase[phase] += e.amount;
  }

  const open = checklist.filter((c) => !c.done);

  return {
    explore: {
      total: items.length,
      isFallback: favorites.length === 0 && items.length > 0,
      preview: exploreSource.slice(0, 3).map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        areaLabel: i.location?.areaLabel,
      })),
    },
    roadtrips: {
      total: roadtrips.length,
      preview: roadtrips.slice(0, 3).map((r) => ({
        id: r.id,
        name: r.name,
        stopCount: r.stops.length,
      })),
    },
    plan: {
      days: new Set(planEntries.map((e) => e.date)).size,
      total: planEntries.length,
      preview: planEntries.slice(0, 3).map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        category: e.category,
      })),
    },
    packing: {
      total: packing.length,
      packed: packing.filter((p) => p.packed).length,
      essentialsLeft: packing.filter((p) => p.essential && !p.packed).length,
    },
    budget: {
      total: expenses.reduce((s, e) => s + e.amount, 0),
      byPhase,
    },
    checklist: {
      total: checklist.length,
      done: checklist.filter((c) => c.done).length,
      open: open.slice(0, 3).map((c) => ({ id: c.id, label: c.label, dueDate: c.dueDate })),
    },
    docs: {
      total: docs.length,
      preview: docs.slice(0, 3).map((d) => ({ id: d.id, fileName: d.fileName, kind: d.kind })),
    },
    photos: {
      total: photos.length,
      preview: photos.slice(0, 9).map((p) => p.id),
    },
    map: {
      points: items
        .filter((i) => i.location)
        .map((i) => ({
          id: i.id,
          lat: i.location!.lat,
          lng: i.location!.lng,
          category: i.category,
        })),
    },
  };
}
