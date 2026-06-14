import { Schema } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IUser {
  email: string;
  name?: string;
  image?: string;
  /** BYOK AI settings. The key is stored encrypted at rest (never returned to the client). */
  aiActive?: 'free' | 'byok';
  aiProvider?: string;
  aiModel?: string;
  byokKeyEnc?: string;
  byokKeyHint?: string;
  aiWarnings?: boolean;
  hasSeeded?: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String },
    image: { type: String },
    aiActive: { type: String, enum: ['free', 'byok'] },
    aiProvider: { type: String },
    aiModel: { type: String },
    byokKeyEnc: { type: String },
    byokKeyHint: { type: String },
    aiWarnings: { type: Boolean, default: true },
    hasSeeded: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const User = getModel<IUser>('User', UserSchema);
