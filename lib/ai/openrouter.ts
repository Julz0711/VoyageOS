import 'server-only';
import { providers, type ModelOption } from '@/config/ai';

/**
 * OpenRouter's free model roster rotates and individual models get rate-limited upstream, so we
 * fetch the live list (free + tool-capable) instead of hardcoding slugs. Cached for an hour;
 * falls back to the static list in config on any error.
 */

interface OpenRouterModel {
  id: string;
  name?: string;
  supported_parameters?: string[];
}

function toLabel(m: OpenRouterModel): string {
  // Names look like "Qwen: Qwen3 Next 80B A3B Instruct (free)" — keep as-is, it's descriptive.
  return m.name?.trim() || m.id;
}

export async function getOpenRouterFreeModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', { next: { revalidate: 3600 } });
    if (!res.ok) return providers.openrouter.models;
    const json = (await res.json()) as { data?: OpenRouterModel[] };
    const free = (json.data ?? [])
      .filter((m) => m.id.endsWith(':free') && (m.supported_parameters?.includes('tools') ?? false))
      .map((m) => ({ id: m.id, label: toLabel(m) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return free.length > 0 ? free : providers.openrouter.models;
  } catch {
    return providers.openrouter.models;
  }
}
