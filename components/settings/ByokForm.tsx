'use client';

import { useActionState, useState, useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  saveByokKey,
  clearByokKey,
  setAiModel,
  setAiWarnings,
  type SaveKeyState,
} from '@/lib/ai/settings';
import { providers, type ModelOption, type ProviderId } from '@/config/ai';
import type { AiInfo } from '@/lib/ai/userSettings';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const byokProviders = Object.values(providers).filter((p) => p.byok);
const selectClass =
  'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

/** Live model list for a provider (dynamic providers get the server-fetched list). */
function modelsFor(providerId: ProviderId, openRouterModels: ModelOption[]): ModelOption[] {
  if (providerId === 'openrouter' && openRouterModels.length > 0) return openRouterModels;
  return providers[providerId].models;
}

export function ByokForm({
  info,
  openRouterModels,
}: {
  info: AiInfo;
  openRouterModels: ModelOption[];
}) {
  const [, startTransition] = useTransition();

  const savedProvider = info.byokProviderId
    ? providers[info.byokProviderId as ProviderId]
    : undefined;
  const savedModels = savedProvider ? modelsFor(savedProvider.id, openRouterModels) : [];

  return (
    <div className="space-y-6">
      {/* Saved key */}
      {info.hasKey && savedProvider && (
        <div className="border-border bg-surface rounded-lg border p-5">
          <p className="eyebrow text-muted mb-3">Your assistant</p>
          <div className="border-border bg-canvas/40 flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{savedProvider.label}</p>
              <p className="text-muted font-sans text-xs">{info.keyHint}</p>
            </div>
            <form action={clearByokKey}>
              <Button type="submit" variant="secondary" size="sm">
                Remove key
              </Button>
            </form>
          </div>

          <div className="mt-4 max-w-xs">
            <Label htmlFor="active-model">Model</Label>
            <select
              id="active-model"
              value={info.byokModelId ?? savedModels[0]?.id}
              onChange={(e) => startTransition(() => void setAiModel(e.target.value))}
              className={selectClass}
            >
              {savedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {!info.available && (
            <p className="text-danger mt-3 text-sm">This key couldn’t be used. Replace it below.</p>
          )}
        </div>
      )}

      {/* Add / replace key */}
      <div className="border-border bg-surface rounded-lg border p-5">
        <p className="eyebrow text-muted mb-3">
          {info.hasKey ? 'Replace your API key' : 'Add an API key'}
        </p>
        {!info.hasKey && (
          <p className="text-muted mb-4 text-sm">
            VoyageOS uses your own AI key. Several providers below have a{' '}
            <span className="text-ink font-medium">free tier</span> — pick one, grab a key, and
            paste it here.
          </p>
        )}
        <KeyForm replacing={info.hasKey} openRouterModels={openRouterModels} />
      </div>

      {/* Behavior */}
      <div className="border-border bg-surface rounded-lg border p-5">
        <p className="eyebrow text-muted mb-3">Chat behavior</p>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            defaultChecked={info.warnings}
            onChange={(e) => startTransition(() => void setAiWarnings(e.target.checked))}
            className="mt-0.5 size-4 accent-[var(--vos-color-primary)]"
          />
          <span className="text-ink text-sm">
            Show usage &amp; rate-limit warnings
            <span className="text-muted mt-0.5 block text-xs">
              When <strong>on</strong>, the assistant warns you after a token-heavy turn (free tiers
              can rate-limit) and notes when it pauses at its step limit. When <strong>off</strong>,
              no warnings — it just does its thing.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function KeyForm({
  replacing,
  openRouterModels,
}: {
  replacing: boolean;
  openRouterModels: ModelOption[];
}) {
  const [state, action, pending] = useActionState<SaveKeyState, FormData>(saveByokKey, undefined);
  const [provider, setProvider] = useState<ProviderId>(byokProviders[0].id);
  const cfg = providers[provider];
  const models = modelsFor(provider, openRouterModels);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderId)}
            className={selectClass}
          >
            {byokProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.freeTier ? ' — free tier' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="model">Model</Label>
          <select
            id="model"
            name="model"
            defaultValue={models[0]?.id}
            key={provider}
            className={selectClass}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <a
        href={cfg.getKeyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink inline-flex items-center gap-1.5 text-sm font-medium underline"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        Get a {cfg.label} key{cfg.freeTier ? ' (free)' : ''}
      </a>

      <div>
        <Label htmlFor="key">API key</Label>
        <Input id="key" name="key" type="password" placeholder="sk-…" autoComplete="off" required />
        <p className="text-muted mt-1 text-xs">
          Encrypted at rest, used only server-side, never shown again.
        </p>
      </div>

      {cfg.caveat && (
        <p className="border-border bg-canvas/60 text-muted rounded-md border px-3 py-2 text-xs leading-relaxed">
          {cfg.caveat}
        </p>
      )}

      {state?.error && <p className="text-danger text-sm">{state.error}</p>}
      {state?.ok && <p className="text-success text-sm">Saved and activated.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : replacing ? 'Replace key' : 'Save key'}
        </Button>
      </div>
    </form>
  );
}
