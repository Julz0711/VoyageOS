import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IBaseLocation {
  lat: number;
  lng: number;
  label: string;
}

export interface ITrip {
  userId: Types.ObjectId;
  name: string;
  destination: string;
  dateStart: Date;
  dateEnd: Date;
  baseLocation: IBaseLocation;
  coverImage?: string;
  /** Category ids this trip leans on — seeds packing defaults, etc. */
  categories: string[];
  /** ISO 4217 currency for budget/expenses (e.g. "EUR"). */
  currency?: string;
  /** Optional overall budget in `currency` units. */
  budget?: number;
  /** Read-only public share token (null/absent = sharing off). */
  shareToken?: string;
  archived: boolean;
}

const BaseLocationSchema = new Schema<IBaseLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const TripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    dateStart: { type: Date, required: true },
    dateEnd: { type: Date, required: true },
    baseLocation: { type: BaseLocationSchema, required: true },
    coverImage: { type: String },
    categories: { type: [String], default: [] },
    currency: { type: String, default: 'EUR' },
    budget: { type: Number },
    shareToken: { type: String, index: true },
    archived: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const Trip = getModel<ITrip>('Trip', TripSchema);
