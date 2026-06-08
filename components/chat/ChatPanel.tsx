'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  isToolUIPart,
  getToolName,
  type UIMessage,
  type ToolUIPart,
  type DynamicToolUIPart,
} from 'ai';
import {
  Sparkles,
  Send,
  Check,
  X,
  Settings2,
  Loader2,
  Eraser,
  Search,
  MapPin,
  CloudSun,
  Square,
} from 'lucide-react';
import type { AiInfo } from '@/lib/ai/userSettings';
import { writeToolNames } from '@/lib/ai/toolNames';
import { clearChat } from '@/lib/chat/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Per-message token usage (attached as message metadata by the chat route). */
function tokensOf(m: UIMessage): number | undefined {
  const t = (m.metadata as { totalTokens?: number } | null | undefined)?.totalTokens;
  return typeof t === 'number' ? t : undefined;
}

// General prompts that make sense for any trip (the assistant pulls in trip context itself).
const suggestions = [
  'What are the must-see spots here?',
  'Plan a relaxed first day',
  'What should I pack for the weather?',
  'Suggest a good rainy-day activity',
];

export function ChatPanel({
  initialMessages,
  aiInfo,
}: {
  initialMessages: UIMessage[];
  aiInfo: AiInfo;
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, addToolApprovalResponse, setMessages, error } =
    useChat({
      messages: initialMessages,
      transport: new DefaultChatTransport({ api: '/api/chat' }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  const busy = status === 'submitted' || status === 'streaming';
  const aiReady = aiInfo.available;

  // The SDK can momentarily emit two messages with the same id during multi-step/approval.
  // Collapse by id (last wins) so React keys stay unique and bubbles aren't duplicated.
  const renderedMessages = Array.from(new Map(messages.map((m) => [m.id, m])).values());

  const sessionTokens = renderedMessages.reduce((sum, m) => sum + (tokensOf(m) ?? 0), 0);

  function clearAll() {
    setMessages([]);
    void clearChat();
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || busy || !aiReady) return;
    setInput('');
    void sendMessage({ text: t });
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  return (
    <div className="border-border bg-surface shadow-card flex h-[74dvh] flex-col overflow-hidden rounded-lg border">
      {/* Header */}
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="rounded-pill bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <span className="text-ink truncate text-sm font-medium">Travel assistant</span>
        </span>
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          {sessionTokens > 0 && (
            <span
              className="text-muted font-sans text-[11px]"
              title={`${sessionTokens.toLocaleString()} tokens used this session`}
            >
              {sessionTokens.toLocaleString()}
              <span className="hidden sm:inline"> tokens</span>
            </span>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              aria-label="Clear chat"
              title="Clear chat"
              className="text-muted hover:text-ink flex items-center gap-1.5 font-sans text-[11px] disabled:opacity-50"
            >
              <Eraser className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Clear chat</span>
            </button>
          )}
          <Link
            href="/settings"
            aria-label="AI settings"
            title={aiInfo.available ? aiInfo.providerLabel : 'No key — set up'}
            className="text-muted hover:text-ink flex items-center gap-1.5 font-sans text-[11px]"
          >
            <Settings2 className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden max-w-[9rem] truncate sm:inline">
              {aiInfo.available ? aiInfo.providerLabel : 'No key — set up'}
            </span>
          </Link>
        </div>
      </div>

      {/* No-key banner — chat is disabled until a provider is connected in Settings. */}
      {!aiReady && (
        <div className="border-border bg-accent/[0.07] flex items-center gap-3 border-b px-5 py-3">
          <span className="rounded-pill bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-sm font-medium">Connect an AI provider to chat</p>
            <p className="text-muted text-xs">
              Add your own API key in Settings to enable the travel assistant.
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-pill bg-primary text-primary-foreground shrink-0 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
          >
            Set up
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {renderedMessages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-heading text-ink text-lg font-semibold">
              {aiReady ? 'Where would you like to go?' : 'Your travel assistant is waiting'}
            </p>
            <p className="text-muted mt-1 text-sm">
              {aiReady
                ? 'I can research places and add them to your trip — you approve every change.'
                : 'Once you connect a provider, I can research places and build your itinerary.'}
            </p>
            {aiReady && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-pill border-border bg-surface text-ink hover:border-ink/25 border px-3 py-1.5 text-sm transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          renderedMessages.map((m) => (
            <MessageView key={m.id} message={m} onApprove={addToolApprovalResponse} />
          ))
        )}

        {busy && (
          <p className="text-muted flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Thinking…
          </p>
        )}
        {error && (
          <div className="border-danger/30 bg-danger/5 text-danger rounded-md border px-3 py-2 text-sm">
            {error.message || 'Something went wrong. Try again.'}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-border flex items-center gap-2 border-t p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!aiReady}
          placeholder={aiReady ? 'Ask about your trip…' : 'Connect a provider in Settings to chat'}
          className="border-border bg-canvas/40 text-ink placeholder:text-muted focus-visible:ring-accent/40 h-10 flex-1 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => stop()}
            aria-label="Stop"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!aiReady || !input.trim()} aria-label="Send">
            <Send className="size-4" aria-hidden />
          </Button>
        )}
      </form>
    </div>
  );
}

function MessageView({
  message,
  onApprove,
}: {
  message: UIMessage;
  onApprove: (r: { id: string; approved: boolean }) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      {message.parts.map((part, i) => {
        if (part.type === 'text') {
          if (!part.text) return null;
          return (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-lg px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-canvas/60 text-ink',
              )}
            >
              {part.text}
            </div>
          );
        }
        if (isToolUIPart(part)) {
          return <ToolView key={i} part={part} onApprove={onApprove} />;
        }
        return null;
      })}
      {!isUser && tokensOf(message) != null && (
        <span className="text-muted/60 font-sans text-[10px]">
          {tokensOf(message)!.toLocaleString()} tokens
        </span>
      )}
    </div>
  );
}

function summarizeTool(name: string, input: unknown): string {
  const v = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'addExploreItem':
      return `Add “${v.title}” to Explore`;
    case 'addExploreItems': {
      const items = (v.items as { title: string }[]) ?? [];
      return `Add ${items.length} places to Explore: ${items.map((i) => i.title).join(', ')}`;
    }
    case 'updateExploreItem': {
      const patch = (v.patch ?? {}) as { title?: string };
      return patch.title ? `Update “${patch.title}”` : 'Update a place';
    }
    case 'toggleFavorite':
      return v.isFavorite ? 'Mark a place as favorite' : 'Unfavorite a place';
    case 'addToCalendar':
      return `Add to your plan on ${v.date}`;
    case 'addPackingItem':
      return `Pack “${v.label}” (${v.category})`;
    default:
      return name;
  }
}

/** Friendly verb + the key argument for a read tool, e.g. Searching “wild swim Treungen”. */
function readToolLabel(
  name: string,
  input: unknown,
): { icon: typeof Search; verb: string; detail?: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'searchPlaces':
      return {
        icon: Search,
        verb: 'Searching',
        detail: typeof v.query === 'string' ? v.query : undefined,
      };
    case 'getTripContext':
      return { icon: MapPin, verb: 'Reading your trip' };
    case 'getWeather':
      return { icon: CloudSun, verb: 'Checking the forecast' };
    default:
      return { icon: Search, verb: name };
  }
}

function ToolView({
  part,
  onApprove,
}: {
  part: ToolUIPart | DynamicToolUIPart;
  onApprove: (r: { id: string; approved: boolean }) => void;
}) {
  const name = getToolName(part);
  const isWrite = writeToolNames.has(name);

  // Read tools — show what's happening, and leave a faint trace once done so the user can see
  // the research the assistant did (rather than it vanishing).
  if (!isWrite) {
    const { icon: Icon, verb, detail } = readToolLabel(name, part.input);
    const done = part.state === 'output-available';
    return (
      <span className="text-muted/80 flex items-center gap-1.5 font-sans text-[11px]">
        {done ? (
          <Icon className="size-3" aria-hidden />
        ) : (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        )}
        {verb}
        {detail ? ` “${detail}”` : ''}
        {!done && '…'}
      </span>
    );
  }

  // Write tools — approval flow.
  if (part.state === 'approval-requested') {
    return (
      <div className="border-accent/40 bg-accent/[0.06] w-full max-w-[90%] rounded-lg border p-3.5">
        <p className="text-muted flex items-center gap-1.5 font-sans text-[11px] tracking-wide uppercase">
          <Sparkles className="text-accent size-3" aria-hidden /> Approve change
        </p>
        <p className="text-ink mt-1.5 text-sm">{summarizeTool(name, part.input)}</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => onApprove({ id: part.approval.id, approved: true })}>
            <Check className="size-4" aria-hidden /> Approve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onApprove({ id: part.approval.id, approved: false })}
          >
            <X className="size-4" aria-hidden /> Reject
          </Button>
        </div>
      </div>
    );
  }

  if (part.state === 'output-available') {
    return (
      <span className="text-success flex items-center gap-1.5 text-sm">
        <Check className="size-4" aria-hidden /> {summarizeTool(name, part.input)} — done
      </span>
    );
  }

  if (part.state === 'output-denied') {
    return <span className="text-muted text-sm">Skipped: {summarizeTool(name, part.input)}</span>;
  }

  if (part.state === 'output-error') {
    return <span className="text-danger text-sm">Couldn’t {summarizeTool(name, part.input)}.</span>;
  }

  return null;
}
