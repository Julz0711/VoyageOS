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

/** Formats an amount in the given currency, falling back gracefully for odd codes. */
export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
