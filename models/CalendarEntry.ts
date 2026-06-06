import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface ICalendarEntry {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  /** References an ExploreItem, or null for a free-form note. */
  exploreItemId?: Types.ObjectId;
  date: Date;
  startTime?: string; // "HH:mm"
  durationMinutes?: number;
  note?: string;
  order: number;
}

const CalendarEntrySchema = new Schema<ICalendarEntry>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exploreItemId: { type: Schema.Types.ObjectId, ref: 'ExploreItem' },
    date: { type: Date, required: true },
    startTime: String,
    durationMinutes: Number,
    note: String,
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

// Queries filter by user+trip (often plus date); a compound index covers the common access path.
CalendarEntrySchema.index({ userId: 1, tripId: 1, date: 1 });

export const CalendarEntry = getModel<ICalendarEntry>('CalendarEntry', CalendarEntrySchema);
