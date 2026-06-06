import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export type DistanceBand = 'doorstep' | '≤15' | '≤45' | 'daytrip';
export type WeatherFit = 'fine' | 'any' | 'wet';
export type ItemSource = 'manual' | 'ai' | 'import';

export interface IItemLocation {
  lat: number;
  lng: number;
  address?: string;
  areaLabel?: string;
}

export interface IDistanceFromBase {
  minutes?: number;
  km?: number;
  band: DistanceBand;
}

export interface IExternalLink {
  label: string;
  url: string;
}

export interface IExploreItem {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  category: string;
  subtitle?: string;
  description?: string;
  location?: IItemLocation;
  distanceFromBase?: IDistanceFromBase;
  tags: string[];
  weatherFit: WeatherFit[];
  dontMiss: boolean;
  isFavorite: boolean;
  externalLinks: IExternalLink[];
  source: ItemSource;
  images: string[];
}

const LocationSchema = new Schema<IItemLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
    areaLabel: String,
  },
  { _id: false },
);

const DistanceSchema = new Schema<IDistanceFromBase>(
  {
    minutes: Number,
    km: Number,
    band: { type: String, enum: ['doorstep', '≤15', '≤45', 'daytrip'], required: true },
  },
  { _id: false },
);

const ExternalLinkSchema = new Schema<IExternalLink>(
  { label: { type: String, required: true }, url: { type: String, required: true } },
  { _id: false },
);

const ExploreItemSchema = new Schema<IExploreItem>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    subtitle: String,
    description: String,
    location: LocationSchema,
    distanceFromBase: DistanceSchema,
    tags: { type: [String], default: [] },
    weatherFit: {
      type: [String],
      enum: ['fine', 'any', 'wet'],
      default: ['any'],
    },
    dontMiss: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    externalLinks: { type: [ExternalLinkSchema], default: [] },
    source: { type: String, enum: ['manual', 'ai', 'import'], default: 'manual' },
    images: { type: [String], default: [] },
  },
  baseSchemaOptions,
);

// All access is scoped to the session user + active trip; one compound index serves every query.
ExploreItemSchema.index({ userId: 1, tripId: 1 });

export const ExploreItem = getModel<IExploreItem>('ExploreItem', ExploreItemSchema);
