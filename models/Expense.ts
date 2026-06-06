import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IExpense {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  /** Amount in the trip's currency (major units, e.g. 12.50). */
  amount: number;
  category: string;
  label: string;
  date: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    label: { type: String, required: true },
    date: { type: Date, required: true },
  },
  baseSchemaOptions,
);

ExpenseSchema.index({ userId: 1, tripId: 1, date: 1 });

export const Expense = getModel<IExpense>('Expense', ExpenseSchema);
