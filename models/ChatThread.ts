import { Schema, type Types } from 'mongoose';
import { baseSchemaOptions, getModel } from './_base';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  /** Names of tools called while producing this message (for transparency/undo). */
  toolCalls?: string[];
  createdAt?: Date;
}

export interface IChatThread {
  tripId: Types.ObjectId;
  userId: Types.ObjectId;
  title?: string;
  messages: IChatMessage[];
  /** Raw AI SDK UIMessages for the assistant thread (JSON), one thread per trip. */
  uiMessages?: unknown[];
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    toolCalls: { type: [String], default: undefined },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatThreadSchema = new Schema<IChatThread>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: String,
    messages: { type: [ChatMessageSchema], default: [] },
    uiMessages: { type: [Schema.Types.Mixed], default: [] },
  },
  baseSchemaOptions,
);

export const ChatThread = getModel<IChatThread>('ChatThread', ChatThreadSchema);
