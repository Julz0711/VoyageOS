import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  type UIMessage,
} from 'ai';
import { requireActiveTrip } from '@/lib/trips/active';
import { getAiUser } from '@/lib/ai/userSettings';
import { getModel } from '@/lib/ai/provider';
import { buildTools } from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/context';
import { saveChatMessages } from '@/lib/chat/persistence';
import { aiLimits } from '@/config/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// NOTE: chat bubbles render plain text (not markdown), so keep these free of **, _, and emoji.
const STUB_MESSAGE =
  'The travel assistant needs your own AI key to chat. Add one in Settings → AI assistant — ' +
  'several providers (Groq, Mistral, Cerebras, OpenRouter, Gemini) have a free tier. Everything ' +
  'else in VoyageOS works without a key.';

const RESET_MESSAGE =
  'I lost track of this conversation’s history. Please use Clear chat (top-right) and ask again.';

const STEP_LIMIT_NOTICE =
  'Paused — I hit this turn’s research limit, so I stopped before running too long. ' +
  'Reply continue and I’ll keep going from where I left off.';

/** Heads-up after a token-heavy turn (only when usage warnings are enabled). */
function usageWarning(totalTokens: number): string {
  const k = Math.round(totalTokens / 100) / 10; // ~one decimal, in thousands
  return (
    `This turn used about ${k}k tokens. Free provider tiers cap tokens per minute/day, so heavy ` +
    'use may get rate-limited — your own paid key avoids that. You can turn off warnings in Settings.'
  );
}

/** Maps a thrown value / finishReason to a friendly chat message, or null to pass through. */
function friendlyError(msg: string): string | null {
  // Broken/stale persisted history that can't be turned into a valid prompt.
  if (/invalid prompt|ModelMessage\[\] schema|do not match/i.test(msg)) {
    return RESET_MESSAGE;
  }
  // Free Groq tier daily/min rate limit.
  if (/rate limit/i.test(msg)) {
    const again = msg.match(/try again in ([0-9hms.\s]+?)\./i)?.[1]?.trim();
    return (
      `You’ve hit the free tier’s usage limit${again ? ` — try again in ${again}` : ''}. ` +
      'Add your own key in Settings → AI assistant for much higher limits.'
    );
  }
  // Smaller free models often can't reliably build tool calls.
  if (
    /failed.?generation|adjust your prompt/i.test(msg) ||
    (/function|tool/i.test(msg) && /fail|invalid/i.test(msg))
  ) {
    return (
      'The model couldn’t build a valid tool call — common with smaller free models. In ' +
      'Settings → AI assistant, pick a larger model or a stronger provider (Claude is the most ' +
      'reliable) for adding items.'
    );
  }
  return null;
}

/**
 * Drops messages with empty content. Reloaded history can contain empty assistant/user
 * messages (e.g. a turn that produced only ignored tool calls), and streamText rejects those
 * with "Invalid prompt: The messages do not match the ModelMessage[] schema".
 */
function sanitizeModelMessages(messages: ModelMessage[]): ModelMessage[] {
  return messages.filter((m) => {
    const c = m.content as unknown;
    if (typeof c === 'string') return c.trim().length > 0;
    if (Array.isArray(c)) return c.length > 0;
    return c != null;
  });
}

/** Best-effort human-readable message from any thrown value (Error, provider object, etc.). */
function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
  return String(error);
}

/** Streams a single assistant text message (used for keyless + recovery cases). */
function stubResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: 'stub' });
      writer.write({ type: 'text-delta', id: 'stub', delta: text });
      writer.write({ type: 'text-end', id: 'stub' });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  const { userId, trip } = await requireActiveTrip();
  if (!trip) return new Response('No active trip', { status: 400 });

  const { messages }: { messages: UIMessage[] } = await req.json();

  const aiUser = await getAiUser(userId);
  const resolved = getModel(aiUser);
  const showWarnings = aiUser.aiWarnings !== false; // default on

  // Keyless fallback: stream a single friendly message instead of failing.
  if (!resolved.available || !resolved.model) {
    return stubResponse(STUB_MESSAGE);
  }

  const tools = buildTools({ userId, tripId: trip.id, base: trip.baseLocation });

  // Tolerate incomplete tool calls (mid-approval / interrupted runs). If the history is too
  // broken to convert at all, guide the user to reset instead of 500-ing.
  let modelMessages: ModelMessage[];
  try {
    const converted = await convertToModelMessages(messages, { tools, ignoreIncompleteToolCalls: true });
    modelMessages = sanitizeModelMessages(converted);
  } catch (error) {
    console.error('[chat] convertToModelMessages failed:', error);
    return stubResponse(RESET_MESSAGE);
  }
  // Nothing usable survived (e.g. fully broken history) — guide the user to reset.
  if (modelMessages.length === 0) {
    return stubResponse(RESET_MESSAGE);
  }

  // Give BYOK keys room to research (multi-search) and still finish; keep the free tier tight.
  const maxSteps = resolved.byok ? aiLimits.maxStepsByok : aiLimits.maxStepsFree;

  const stream = createUIMessageStream<UIMessage>({
    originalMessages: messages,
    execute: async ({ writer }) => {
      const result = streamText({
        model: resolved.model!,
        // System via the dedicated option (not a message) to avoid the prompt-injection warning.
        // Anthropic prompt-caching is applied to the tool schemas instead (see buildTools).
        system: buildSystemPrompt(trip),
        messages: modelMessages,
        tools,
        // Each step re-sends the full context (prompt + tools + history), so the budget trades
        // capability against tokens — see aiLimits.maxSteps*.
        stopWhen: stepCountIs(maxSteps),
        onError: (event) => {
          console.error('[chat] streamText error:', event);
        },
      });
      // Attach this turn's token usage to the assistant message so the UI can show it.
      writer.merge(
        result.toUIMessageStream({
          messageMetadata: ({ part }) =>
            part.type === 'finish' ? { totalTokens: part.totalUsage.totalTokens } : undefined,
        }),
      );

      // Optional usage / rate-limit warnings (Settings → AI assistant). When off, the chat runs
      // without any of these interjections.
      if (showWarnings) {
        const [finishReason, usage] = await Promise.all([result.finishReason, result.usage]);
        const notes: string[] = [];
        // Halted by the step cap mid-research → invite the user to continue.
        if (finishReason === 'tool-calls') notes.push(STEP_LIMIT_NOTICE);
        // Token-heavy turn → heads-up that free tiers may rate-limit.
        const total = usage?.totalTokens;
        if (typeof total === 'number' && total >= aiLimits.warnTokenThreshold) {
          notes.push(usageWarning(total));
        }
        if (notes.length > 0) {
          const id = 'usage-notice';
          writer.write({ type: 'text-start', id });
          writer.write({ type: 'text-delta', id, delta: notes.join('\n\n') });
          writer.write({ type: 'text-end', id });
        }
      }
    },
    onFinish: async ({ responseMessage }) => {
      await saveChatMessages(userId, trip.id, [...messages, responseMessage]);
    },
    onError: (error) => {
      console.error('[chat] stream response error:', error);
      const msg = errorText(error);
      return friendlyError(msg) ?? msg;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
