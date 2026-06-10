'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { Expense } from '@/models/Expense';
import { Trip } from '@/models/Trip';
import {
  expenseCategoryIds,
  expensePhaseIds,
  phaseForDate,
  currencies,
} from '@/config/expenses';

const addSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0').max(10_000_000),
  category: z.enum(expenseCategoryIds as [string, ...string[]]),
  label: z.string().trim().min(1, 'Add a short label').max(160),
  date: z.coerce.date(),
  phase: z.enum(expensePhaseIds as [string, ...string[]]).optional(),
});

export type AddExpenseState = { error?: string; ok?: boolean } | undefined;

export async function addExpense(_prev: AddExpenseState, formData: FormData): Promise<AddExpenseState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = addSchema.safeParse({
    amount: formData.get('amount'),
    category: formData.get('category'),
    label: formData.get('label'),
    date: formData.get('date'),
    phase: formData.get('phase') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid expense' };

  // Fall back to the natural phase derived from the date when none was chosen.
  const phase = parsed.data.phase ?? phaseForDate(parsed.data.date, trip.dateStart, trip.dateEnd);

  await connectToDatabase();
  await Expense.create({
    tripId: trip.id,
    userId,
    amount: Math.round(parsed.data.amount * 100) / 100,
    category: parsed.data.category,
    label: parsed.data.label,
    date: parsed.data.date,
    phase,
  });

  revalidatePath('/budget');
  return { ok: true };
}

const updateSchema = addSchema.extend({
  id: z.string().refine(isValidObjectId, 'Invalid expense'),
});

export async function updateExpense(_prev: AddExpenseState, formData: FormData): Promise<AddExpenseState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    label: formData.get('label'),
    date: formData.get('date'),
    phase: formData.get('phase') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid expense' };

  const phase = parsed.data.phase ?? phaseForDate(parsed.data.date, trip.dateStart, trip.dateEnd);

  await connectToDatabase();
  await Expense.updateOne(
    { _id: parsed.data.id, userId, tripId: trip.id },
    {
      $set: {
        amount: Math.round(parsed.data.amount * 100) / 100,
        category: parsed.data.category,
        label: parsed.data.label,
        date: parsed.data.date,
        phase,
      },
    },
  );

  revalidatePath('/budget');
  return { ok: true };
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { userId } = await requireSession();
  if (!isValidObjectId(expenseId)) return;
  await connectToDatabase();
  await Expense.deleteOne({ _id: expenseId, userId });
  revalidatePath('/budget');
}

/** A budget input: a non-negative number, or '' to clear. */
const budgetField = z.union([z.coerce.number().min(0).max(1_000_000_000), z.literal('')]).optional();

const budgetSchema = z.object({
  budgetPre: budgetField,
  budgetDuring: budgetField,
  budgetPost: budgetField,
  currency: z.enum(currencies as [string, ...string[]]),
});

export type SetBudgetState = { error?: string; ok?: boolean } | undefined;

/** Normalizes a parsed budget field to a number or undefined (empty/clear). */
function toAmount(v: number | '' | undefined): number | undefined {
  return v === '' || v == null ? undefined : v;
}

export async function setTripBudget(_prev: SetBudgetState, formData: FormData): Promise<SetBudgetState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = budgetSchema.safeParse({
    budgetPre: formData.get('budgetPre') ?? '',
    budgetDuring: formData.get('budgetDuring') ?? '',
    budgetPost: formData.get('budgetPost') ?? '',
    currency: formData.get('currency'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid budget' };

  const pre = toAmount(parsed.data.budgetPre);
  const during = toAmount(parsed.data.budgetDuring);
  const post = toAmount(parsed.data.budgetPost);
  const hasPhaseBudgets = pre != null || during != null || post != null;
  // Overall budget is the auto-calculated sum of the per-phase budgets.
  const budget = (pre ?? 0) + (during ?? 0) + (post ?? 0);

  const set: Record<string, unknown> = { currency: parsed.data.currency };
  const unset: Record<string, string> = {};
  if (hasPhaseBudgets) {
    set.phaseBudgets = { pre, during, post };
    set.budget = budget;
  } else {
    unset.phaseBudgets = '';
    unset.budget = '';
  }

  await connectToDatabase();
  await Trip.updateOne(
    { _id: trip.id, userId },
    {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    },
  );

  revalidatePath('/budget');
  revalidatePath('/dashboard');
  return { ok: true };
}
