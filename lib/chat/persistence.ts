import 'server-only';
import { isToolOrDynamicToolUIPart, type UIMessage } from 'ai';
import { isValidObjectId } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ChatThread } from '@/models/ChatThread';

/**
 * Reloaded history must convert to a valid prompt. We keep only:
 *  - non-empty text parts, and
 *  - tool parts that actually completed (`output-available`).
 * Everything else (pending/denied/errored tool calls left over from an interrupted approval,
 * reasoning/step markers, etc.) is dropped — otherwise an unpaired tool call makes streamText
 * reject the prompt ("…do not match the ModelMessage[] schema"). Empty messages are removed.
 */
function cleanMessage(m: UIMessage): UIMessage {
  const parts = (m.parts ?? []).filter((p) => {
    if (p.type === 'text') return p.text.trim().length > 0;
    if (isToolOrDynamicToolUIPart(p)) return p.state === 'output-available';
    return false;
  });
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
