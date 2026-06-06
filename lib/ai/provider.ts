import 'server-only';
import type { LanguageModel } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { decryptSecret } from '@/lib/crypto';
import { providers, defaultProvider, defaultModel, type ProviderConfig, type ProviderId } from '@/config/ai';
import type { IUser } from '@/models/User';

export interface ResolvedModel {
  model: LanguageModel | null;
  providerId: ProviderId;
  modelId: string;
  providerLabel: string;
  /** False when no usable key is configured — the chat shows a friendly "add a key" message. */
  available: boolean;
  /** True when using the user's own key. */
  byok: boolean;
}

function instantiate(providerId: ProviderId, modelId: string, apiKey: string): LanguageModel {
  switch (providerId) {
    case 'groq':
      return createGroq({ apiKey })(modelId);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case 'mistral':
      return createMistral({ apiKey })(modelId);
    case 'cerebras':
      return createCerebras({ apiKey })(modelId);
    case 'openrouter':
      return createOpenRouter({ apiKey })(modelId);
    case 'anthropic':
      return createAnthropic({ apiKey })(modelId);
    case 'openai':
      return createOpenAI({ apiKey })(modelId);
  }
}

/** Returns `id` if usable for the provider, otherwise the provider's first model. */
function pickModel(cfg: ProviderConfig, id?: string): string {
  // Dynamic-model providers (OpenRouter) have a rotating roster not captured in `cfg.models`,
  // so accept any saved id rather than forcing it back to the static fallback.
  if (cfg.dynamicModels) return id || cfg.models[0].id;
  return id && cfg.models.some((m) => m.id === id) ? id : cfg.models[0].id;
}

function unavailable(): ResolvedModel {
  return {
    model: null,
    providerId: defaultProvider,
    modelId: defaultModel,
    providerLabel: providers[defaultProvider].label,
    available: false,
    byok: false,
  };
}

/**
 * Resolves the language model for a user. The app is BYOK-only: a user must have saved their own
 * key (any provider, including a free-tier one like Groq/Gemini/Mistral). There is no app-owned
 * server key fallback. The key is decrypted only here, server-side, at call time.
 */
export function getModel(
  user: Pick<IUser, 'aiActive' | 'aiProvider' | 'aiModel' | 'byokKeyEnc'>,
): ResolvedModel {
  if (!user.byokKeyEnc || !user.aiProvider) return unavailable();

  const providerId = user.aiProvider as ProviderId;
  const cfg = providers[providerId];
  if (!cfg) return unavailable();

  try {
    const modelId = pickModel(cfg, user.aiModel);
    const apiKey = decryptSecret(user.byokKeyEnc);
    return {
      model: instantiate(providerId, modelId, apiKey),
      providerId,
      modelId,
      providerLabel: cfg.label,
      available: true,
      byok: true,
    };
  } catch {
    // Decryption failed (e.g. rotated BYOK_ENCRYPTION_KEY) → treat as no usable key.
    return unavailable();
  }
}
