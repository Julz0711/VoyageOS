import 'server-only';
import type { UIMessage } from 'ai';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ChatThread } from '@/models/ChatThread';

/**
 * Reloaded history must convert to a valid prompt. Past tool calls (even completed ones) can
 * leave the persisted thread in a shape streamText rejects on reload ("…do not match the
 * ModelMessage[] schema") — e.g. an unpaired tool call from an interrupted approval. We don't
 * need tool I/O from prior turns: the model re-derives current state via `getTripContext`. So on
 * load we keep ONLY non-empty text and drop every tool/other part — a text-only history always
 * converts cleanly. (Live in-session approvals are unaffected; this only touches loaded history.)
 */
function cleanMessage(m: UIMessage): UIMessage {
  const parts = (m.parts ?? []).filter((p) => p.type === 'text' && p.text.trim().length > 0);
  return { ...m, parts };
}

/** One assistant thread per (user, trip) for v1. Stores raw UIMessages. */
export async function loadChatMessages(userId: string, tripId: string): Promise<UIMessage[]> {
  if (!isValidObjectId(tripId)) return [];
  await connectToDatabase();
  const thread = await ChatThread.findOne({ userId, tripId }).select('uiMessages').lean();
  const stored = (thread?.uiMessages as UIMessage[] | undefined) ?? [];
  return stored.map(cleanMessage).filter((m) => m.parts.length > 0);
}

export async function saveChatMessages(
  userId: string,
  tripId: string,
  messages: UIMessage[],
): Promise<void> {
  await connectToDatabase();
  await ChatThread.findOneAndUpdate(
    { userId, tripId },
    { $set: { uiMessages: messages } },
    { upsert: true, setDefaultsOnInsert: true },
  );
}
