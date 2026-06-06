import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IPackingItem {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  category: string; // group label, e.g. "Outdoor & hiking"
  label: string;
  packed: boolean;
  essential?: boolean;
  quantityHint?: string;
  order: number;
}

const PackingItemSchema = new Schema<IPackingItem>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    label: { type: String, required: true },
    packed: { type: Boolean, default: false },
    essential: { type: Boolean, default: false },
    quantityHint: String,
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

PackingItemSchema.index({ userId: 1, tripId: 1 });

export const PackingItem = getModel<IPackingItem>('PackingItem', PackingItemSchema);
