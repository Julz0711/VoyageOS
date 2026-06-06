import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IChecklistItem {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  label: string;
  done: boolean;
  dueDate?: Date;
  order: number;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true },
    done: { type: Boolean, default: false },
    dueDate: { type: Date },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

ChecklistItemSchema.index({ userId: 1, tripId: 1 });

export const ChecklistItem = getModel<IChecklistItem>('ChecklistItem', ChecklistItemSchema);
