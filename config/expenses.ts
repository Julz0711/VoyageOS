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
