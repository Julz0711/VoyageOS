/**
 * AI provider & model configuration (PRD §5.3, §7). The published app is bring-your-own-key
 * (BYOK): every user adds their own API key. Several providers below offer a FREE key tier, so
 * users can get going at no cost. Swapping/adding providers is a config change here — pair each
 * new `ProviderId` with an `instantiate()` case in `lib/ai/provider.ts`.
 *
 * Plain data/types only — no secrets, no SDK calls.
 */

export type ProviderId =
  | 'groq'
  | 'google'
  | 'mistral'
  | 'cerebras'
  | 'openrouter'
  | 'anthropic'
  | 'openai';

export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Requires a user-supplied (BYOK) key. Always true now — kept for clarity/validation. */
  byok: boolean;
  /** This provider offers a free API-key tier (shown as a badge in the key picker). */
  freeTier: boolean;
  /** Where the user creates an API key. */
  getKeyUrl: string;
  /** Static model list (also the fallback when `dynamicModels` fetch fails). */
  models: ModelOption[];
  /** Models are fetched live at runtime (e.g. OpenRouter's rotating free roster). */
  dynamicModels?: boolean;
  /** Surfaced in the UI (e.g. EU caveat, rate-limit notes). */
  caveat?: string;
}

// Order matters: free-tier providers first so they surface at the top of the picker.
export const providers: Record<ProviderId, ProviderConfig> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    byok: true,
    freeTier: true,
    getKeyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
    ],
    caveat:
      'Free Groq keys have a low daily token limit, and the smaller models are unreliable at ' +
      'tool calls. Great for chat; for heavy item-adding, a larger model helps.',
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    byok: true,
    freeTier: true,
    getKeyUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    caveat:
      'Gemini’s free tier is unavailable in the EU/EEA/UK/Switzerland (quota 0) unless billing ' +
      'is enabled, and may use free-tier data for training.',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    byok: true,
    freeTier: true,
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    models: [
      { id: 'mistral-small-latest', label: 'Mistral Small' },
      { id: 'open-mistral-nemo', label: 'Mistral Nemo' },
    ],
    caveat: 'Mistral’s free “Experiment” tier requires phone verification and is rate-limited.',
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    byok: true,
    freeTier: true,
    getKeyUrl: 'https://cloud.cerebras.ai/',
    models: [
      { id: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
      { id: 'llama3.1-8b', label: 'Llama 3.1 8B (fast)' },
    ],
    caveat: 'Very fast free tier with daily limits; smaller models can struggle with tool calls.',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    byok: true,
    freeTier: true,
    getKeyUrl: 'https://openrouter.ai/keys',
    // Fetched live (tool-capable :free models). These are only the fallback if the fetch fails.
    dynamicModels: true,
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
      { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B (free)' },
      { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
    ],
    caveat:
      'One key unlocks many models. The “:free” models rotate, are rate-limited, and may log ' +
      'prompts; add credits for higher limits, stable endpoints, and paid models.',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    byok: true,
    freeTier: false,
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
    ],
    caveat: 'Paid only (no free tier), but the most reliable at tool calls. Pennies per session.',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    byok: true,
    freeTier: false,
    getKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    ],
  },
};

/** BYOK is required in production. A sensible default for display fallbacks only. */
export const defaultProvider: ProviderId = 'groq';
export const defaultModel = providers.groq.models[0].id;

/** Caps to prevent runaway tool loops (PRD §6). Enforced server-side in the tool handlers
 * (not as a JSON-schema `maxItems`, which makes providers hard-reject the whole call). */
export const aiLimits = {
  maxToolWritesPerTurn: 8,
  maxBatchSize: 20,
  /**
   * Max agentic steps per turn. Each step re-sends the full context, so the budget trades
   * capability against tokens (and money on BYOK). Tools + system are prompt-cached on
   * Anthropic, so most of that re-sent prefix is cheap; 8 leaves room for several searches
   * plus an item proposal while keeping a turn to ~10¢ on Sonnet. Free tier stays tight.
   */
  maxStepsByok: 8,
  maxStepsFree: 5,
} as const;
