import { type Model, type Schema, models, model } from 'mongoose';

/**
 * Shared schema options: timestamps + clean JSON (`_id` -> `id`, drop `__v`) so documents
 * serialize predictably for the client. Nested subdocuments keep their own `_id` off.
 */
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true, versionKey: false },
} as const;

/** Registers a model once, reusing the cached one across HMR reloads. */
export function getModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T>) ?? model<T>(name, schema);
}
