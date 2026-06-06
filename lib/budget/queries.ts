import 'server-only';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { Expense } from '@/models/Expense';
import { serializeDocs } from '@/lib/serialize';
import type { ExpenseDTO } from '@/lib/dto';

/** All expenses for a trip (newest first), scoped to the session user. */
export async function getExpenses(userId: string, tripId: string): Promise<ExpenseDTO[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const docs = await Expense.find({ userId, tripId }).sort({ date: -1, createdAt: -1 }).lean();
  return serializeDocs<ExpenseDTO>(docs);
}
