import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

/** A trip photo. Like documents, the object key is private — served only via the photos route. */
export interface IPhoto {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  /** Free-text "moment" caption. */
  caption?: string;
  /** Tagged Explore place. */
  linkedItemId?: Types.ObjectId;
  /** Tagged trip day (YYYY-MM-DD). */
  day?: string;
}

const PhotoSchema = new Schema<IPhoto>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    caption: String,
    linkedItemId: { type: Schema.Types.ObjectId, ref: 'ExploreItem' },
    day: String,
  },
  baseSchemaOptions,
);

PhotoSchema.index({ userId: 1, tripId: 1, createdAt: -1 });

export const Photo = getModel<IPhoto>('Photo', PhotoSchema);
