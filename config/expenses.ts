import type { LucideIcon } from 'lucide-react';
import {
  Plane,
  BedDouble,
  UtensilsCrossed,
  Ticket,
  ShoppingBag,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';

/** Expense categories are DATA (mirrors config/categories.ts). */
export interface ExpenseCategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Theme color token for the breakdown bar. */
  color: string;
}

export const expenseCategories: Record<string, ExpenseCategoryDef> = {
  transport: { id: 'transport', label: 'Transport', icon: Plane, color: 'var(--vos-color-map-food)' },
  lodging: { id: 'lodging', label: 'Lodging', icon: BedDouble, color: 'var(--vos-color-map-culture)' },
  food: { id: 'food', label: 'Food & drink', icon: UtensilsCrossed, color: 'var(--vos-color-primary)' },
  activities: { id: 'activities', label: 'Activities', icon: Ticket, color: 'var(--vos-color-map-hike)' },
  shopping: { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'var(--vos-color-map-swim)' },
  fees: { id: 'fees', label: 'Fees & other', icon: Receipt, color: 'var(--vos-color-accent-2)' },
  other: { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'var(--vos-color-muted)' },
};

export const expenseCategoryIds = Object.keys(expenseCategories);

export function getExpenseCategory(id: string): ExpenseCategoryDef {
  return expenseCategories[id] ?? expenseCategories.other;
}

/** Common currencies offered in the budget settings (ISO 4217). */
export const currencies = ['EUR', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD'];

export const DEFAULT_CURRENCY = 'EUR';

/**
 * Each currency's "home" locale, so formatting is DETERMINISTIC — the same on the server and
 * the client regardless of the browser's locale. Using the ambient locale (`undefined`) causes
 * React hydration mismatches (e.g. server `€150.00` vs. a German browser's `150,00 €`).
 */
const CURRENCY_LOCALE: Record<string, string> = {
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'de-CH',
  NOK: 'nb-NO',
  SEK: 'sv-SE',
  DKK: 'da-DK',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

/** Formats an amount in the given currency, falling back gracefully for odd codes. */
export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Spend phases — *when* money is spent relative to the trip window. Each expense carries a phase
 * (auto-derived from its date vs. the trip dates, but overridable) so you can see and budget for
 * planning costs, on-the-ground spend, and after-the-fact settling separately.
 */
export type ExpensePhase = 'pre' | 'during' | 'post';

export interface ExpensePhaseDef {
  id: ExpensePhase;
  /** Full label, e.g. for headings. */
  label: string;
  /** Compact label for chips/cards. */
  short: string;
  /** One-line hint of what belongs here. */
  hint: string;
  /** Theme color token. */
  color: string;
}

export const expensePhases: Record<ExpensePhase, ExpensePhaseDef> = {
  pre: {
    id: 'pre',
    label: 'Before the trip',
    short: 'Before',
    hint: 'Booked & bought ahead — flights, stays, gear',
    color: 'var(--vos-color-map-culture)', // violet
  },
  during: {
    id: 'during',
    label: 'During the trip',
    short: 'During',
    hint: 'On the ground — food, transport, activities',
    color: 'var(--vos-color-map-swim)', // teal
  },
  post: {
    id: 'post',
    label: 'After the trip',
    short: 'After',
    hint: 'Settled afterwards — split bills, late charges',
    color: 'var(--vos-color-map-food)', // orange
  },
};

export const expensePhaseIds = Object.keys(expensePhases) as ExpensePhase[];

export function getExpensePhase(id: string): ExpensePhaseDef {
  return expensePhases[id as ExpensePhase] ?? expensePhases.during;
}

/** Just the date part (YYYY-MM-DD) of an ISO string or Date, for lexicographic comparison. */
function dayKey(value: string | Date): string {
  return (typeof value === 'string' ? value : value.toISOString()).slice(0, 10);
}

/** The natural phase for an expense date relative to the trip window. */
export function phaseForDate(
  date: string | Date,
  tripStart: string | Date,
  tripEnd: string | Date,
): ExpensePhase {
  const d = dayKey(date);
  if (d < dayKey(tripStart)) return 'pre';
  if (d > dayKey(tripEnd)) return 'post';
  return 'during';
}
