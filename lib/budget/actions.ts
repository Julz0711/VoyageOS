'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { requireSession } from '@/lib/auth/dal';
import { requireActiveTrip } from '@/lib/trips/active';
import { Expense } from '@/models/Expense';
import { Trip } from '@/models/Trip';
import { expenseCategoryIds, currencies } from '@/config/expenses';

const addSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0').max(10_000_000),
  category: z.enum(expenseCategoryIds as [string, ...string[]]),
  label: z.string().trim().min(1, 'Add a short label').max(160),
  date: z.coerce.date(),
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
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid expense' };

  await connectToDatabase();
  await Expense.create({
    tripId: trip.id,
    userId,
    amount: Math.round(parsed.data.amount * 100) / 100,
    category: parsed.data.category,
    label: parsed.data.label,
    date: parsed.data.date,
  });

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

const budgetSchema = z.object({
  budget: z.union([z.coerce.number().min(0).max(1_000_000_000), z.literal('')]).optional(),
  currency: z.enum(currencies as [string, ...string[]]),
});

export type SetBudgetState = { error?: string; ok?: boolean } | undefined;

export async function setTripBudget(_prev: SetBudgetState, formData: FormData): Promise<SetBudgetState> {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return { error: 'No active trip' };

  const parsed = budgetSchema.safeParse({
    budget: formData.get('budget') ?? '',
    currency: formData.get('currency'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid budget' };

  const budget = parsed.data.budget === '' || parsed.data.budget == null ? undefined : parsed.data.budget;

  await connectToDatabase();
  await Trip.updateOne(
    { _id: trip.id, userId },
    budget == null
      ? { $set: { currency: parsed.data.currency }, $unset: { budget: '' } }
      : { $set: { currency: parsed.data.currency, budget } },
  );

  revalidatePath('/budget');
  revalidatePath('/dashboard');
  return { ok: true };
}
