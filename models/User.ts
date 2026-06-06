import { Schema } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IUser {
  email: string;
  name?: string;
  image?: string;
  /** BYOK AI settings. The key is stored encrypted at rest (never returned to the client). */
  /** Which assistant is active: 'free' (server Groq) or 'byok' (the user's key). */
  aiActive?: 'free' | 'byok';
  aiProvider?: string; // provider of the saved BYOK key
  aiModel?: string; // selected model for the active provider
  byokKeyEnc?: string;
  byokKeyHint?: string; // e.g. "····abcd" for display only
  /** Whether the first-run starter trip has been seeded (once per user, ever). */
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
    hasSeeded: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

export const User = getModel<IUser>('User', UserSchema);
