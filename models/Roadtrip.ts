import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IRoadtrip {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  notes?: string;
  /** Ordered Explore item ids that make up the route. */
  stopIds: Types.ObjectId[];
  /** The mirrored Explore card created for this roadtrip. */
  exploreItemId?: Types.ObjectId;
}

const RoadtripSchema = new Schema<IRoadtrip>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    notes: { type: String },
    stopIds: { type: [Schema.Types.ObjectId], ref: 'ExploreItem', default: [] },
    exploreItemId: { type: Schema.Types.ObjectId, ref: 'ExploreItem' },
  },
  baseSchemaOptions,
);

RoadtripSchema.index({ userId: 1, tripId: 1 });

export const Roadtrip = getModel<IRoadtrip>('Roadtrip', RoadtripSchema);
