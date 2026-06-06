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
import { Sparkles, Send, Check, X, Settings2, Loader2, Eraser, Search, MapPin, CloudSun, Square } from 'lucide-react';
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

const suggestions = [
  'Find 4 wild-swim spots near the cabin',
  'Plan a relaxed day 3 with a café and one easy hike',
  'What should I pack for the weather?',
  'Suggest a rainy-day activity',
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

  const { messages, sendMessage, status, stop, addToolApprovalResponse, setMessages, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const busy = status === 'submitted' || status === 'streaming';

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
    if (!t || busy) return;
    setInput('');
    void sendMessage({ text: t });
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  return (
    <div className="flex h-[74dvh] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-pill bg-accent text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-ink">Travel assistant</span>
        </span>
        <div className="flex items-center gap-3">
          {sessionTokens > 0 && (
            <span
              className="font-mono text-[11px] text-muted"
              title="Total tokens used this session"
            >
              {sessionTokens.toLocaleString()} tokens
            </span>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className="flex items-center gap-1.5 font-mono text-[11px] text-muted hover:text-ink disabled:opacity-50"
            >
              <Eraser className="size-3.5" aria-hidden />
              Clear chat
            </button>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-1.5 font-mono text-[11px] text-muted hover:text-ink"
          >
            <Settings2 className="size-3.5" aria-hidden />
            {aiInfo.available ? aiInfo.providerLabel : 'No key — set up'}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {renderedMessages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-display text-lg font-semibold text-ink">
              Where would you like to go?
            </p>
            <p className="mt-1 text-sm text-muted">
              I can research places and add them to your trip — you approve every change.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink/25"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          renderedMessages.map((m) => (
            <MessageView key={m.id} message={m} onApprove={addToolApprovalResponse} />
          ))
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Thinking…
          </p>
        )}
        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
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
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your trip…"
          className="h-10 flex-1 rounded-md border border-border bg-canvas/40 px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
        {busy ? (
          <Button type="button" size="icon" variant="secondary" onClick={() => stop()} aria-label="Stop">
            <Square className="size-3.5 fill-current" aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
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
                'max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2 text-sm leading-relaxed',
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
        <span className="font-mono text-[10px] text-muted/60">
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
function readToolLabel(name: string, input: unknown): { icon: typeof Search; verb: string; detail?: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'searchPlaces':
      return { icon: Search, verb: 'Searching', detail: typeof v.query === 'string' ? v.query : undefined };
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
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted/80">
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
      <div className="w-full max-w-[90%] rounded-lg border border-accent/40 bg-accent/[0.06] p-3.5">
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-muted">
          <Sparkles className="size-3 text-accent" aria-hidden /> Approve change
        </p>
        <p className="mt-1.5 text-sm text-ink">{summarizeTool(name, part.input)}</p>
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
      <span className="flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" aria-hidden /> {summarizeTool(name, part.input)} — done
      </span>
    );
  }

  if (part.state === 'output-denied') {
    return <span className="text-sm text-muted">Skipped: {summarizeTool(name, part.input)}</span>;
  }

  if (part.state === 'output-error') {
    return <span className="text-sm text-danger">Couldn’t {summarizeTool(name, part.input)}.</span>;
  }

  return null;
}
