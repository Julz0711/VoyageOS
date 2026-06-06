import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export type DocumentKind =
  | 'ticket'
  | 'booking'
  | 'reservation'
  | 'insurance'
  | 'id'
  | 'map'
  | 'other';

export interface IDocument {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Object-storage key — never a public URL. Served only via short-lived signed URLs. */
  storageKey: string;
  kind: DocumentKind;
  linkedItemId?: Types.ObjectId;
  notes?: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    kind: {
      type: String,
      enum: ['ticket', 'booking', 'reservation', 'insurance', 'id', 'map', 'other'],
      default: 'other',
    },
    linkedItemId: { type: Schema.Types.ObjectId, ref: 'ExploreItem' },
    notes: String,
  },
  baseSchemaOptions,
);

DocumentSchema.index({ userId: 1, tripId: 1 });

export const TripDocument = getModel<IDocument>('Document', DocumentSchema);
