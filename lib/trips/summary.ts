import 'server-only';
import { getExploreItems } from '@/lib/explore/queries';
import { getRoadtrips } from '@/lib/roadtrips/queries';
import { getPlanEntries } from '@/lib/calendar/queries';
import { getPackingItems } from '@/lib/packing/queries';
import { getExpenses } from '@/lib/budget/queries';
import { getChecklist } from '@/lib/checklist/queries';
import { getDocuments } from '@/lib/documents/queries';
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
  budget: { total: number; byCategory: { category: string; amount: number }[] };
  checklist: {
    total: number;
    done: number;
    open: { id: string; label: string; dueDate?: string }[];
  };
  docs: {
    total: number;
    preview: { id: string; fileName: string; kind: DocumentKind }[];
  };
  map: {
    points: { id: string; lat: number; lng: number; category: string }[];
  };
}

/** Aggregates every section's data into one compact payload for the trip summary page. */
export async function getTripSummary(userId: string, tripId: string): Promise<TripSummary> {
  const [items, roadtrips, planEntries, packing, expenses, checklist, docs] = await Promise.all([
    getExploreItems(userId, tripId),
    getRoadtrips(userId, tripId),
    getPlanEntries(userId, tripId),
    getPackingItems(userId, tripId),
    getExpenses(userId, tripId),
    getChecklist(userId, tripId),
    getDocuments(userId, tripId),
  ]);

  const favorites = items.filter((i) => i.isFavorite);
  const exploreSource = favorites.length > 0 ? favorites : items;

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);

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
      byCategory: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => ({ category, amount })),
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
