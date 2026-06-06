import 'server-only';
import { tool, jsonSchema, type ToolSet } from 'ai';
import { z } from 'zod';
import { categoryIds } from '@/config/categories';
import { aiLimits } from '@/config/ai';
import * as handlers from '@/lib/ai/toolHandlers';
import type { ExploreItemInput } from '@/lib/ai/toolHandlers';

export { writeToolNames } from '@/lib/ai/toolNames';

const categoryEnum = z.enum(categoryIds as [string, ...string[]]);
const weatherEnum = z.enum(['fine', 'any', 'wet']);

// Models can't reliably emit the internal "≤15"/"≤45" glyphs, so expose ASCII tokens to the AI.
// IMPORTANT: keep this a PLAIN enum (no .transform) — write tools need approval, which validates
// the input twice (request + resubmit); a transform would mutate it and fail re-validation.
// Mapping ASCII → internal band happens in `execute` via `normalizeItem`/`normalizePatch`.
const aiBand = z
  .enum(['doorstep', 'within15', 'within45', 'daytrip'])
  .describe('Distance band from base: doorstep, within15, within45, or daytrip');

const bandMap: Record<string, 'doorstep' | '≤15' | '≤45' | 'daytrip'> = {
  doorstep: 'doorstep',
  within15: '≤15',
  within45: '≤45',
  daytrip: 'daytrip',
};

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  areaLabel: z.string().optional(),
});

const exploreItemInput = z.object({
  title: z.string().min(1).max(160).describe('Specific, real place name (not a generic category)'),
  category: categoryEnum,
  subtitle: z.string().max(280).optional().describe('One vivid sentence — the hook'),
  description: z
    .string()
    .max(1200)
    .optional()
    .describe('2–4 sentences: what it is, why it’s worth it, and a practical tip'),
  location: locationSchema.optional(),
  distanceFromBase: z.object({ minutes: z.number().int().optional(), band: aiBand }).optional(),
  tags: z.array(z.string()).max(8).optional(),
  weatherFit: z.array(weatherEnum).optional(),
  dontMiss: z.boolean().optional(),
});

type AiItemInput = z.infer<typeof exploreItemInput>;

/** Maps the AI's ASCII band token to the internal stored value. */
function normalizeItem(input: AiItemInput): ExploreItemInput {
  return {
    ...input,
    distanceFromBase: input.distanceFromBase
      ? { minutes: input.distanceFromBase.minutes, band: bandMap[input.distanceFromBase.band] }
      : undefined,
  };
}

function normalizePatch(patch: Partial<AiItemInput>): Partial<ExploreItemInput> {
  const { distanceFromBase, ...rest } = patch;
  if (!distanceFromBase) return rest;
  return { ...rest, distanceFromBase: { minutes: distanceFromBase.minutes, band: bandMap[distanceFromBase.band] } };
}

export interface ToolContext {
  userId: string;
  tripId: string;
  base: { lat: number; lng: number };
}

// Some models (e.g. Claude) send `null` for a no-argument tool, which fails a strict object
// schema. These jsonSchema definitions keep the provider schema a plain object but coerce
// null/undefined to {} during validation.
const noArgsSchema = jsonSchema<Record<string, never>>(
  { type: 'object', properties: {}, additionalProperties: false },
  { validate: () => ({ success: true, value: {} }) },
);

const weatherArgsSchema = jsonSchema<{ days?: number }>(
  {
    type: 'object',
    properties: {
      days: { type: 'integer', minimum: 1, maximum: 16, description: 'Forecast days (default 7)' },
    },
    additionalProperties: false,
  },
  {
    validate: (value) => {
      const o = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const days = typeof o.days === 'number' ? o.days : undefined;
      return { success: true, value: { days } };
    },
  },
);

/**
 * Builds the tool set scoped to the user + active trip. Read tools auto-run; write tools have
 * `needsApproval: true`, so the SDK pauses for user approval before `execute` commits the change.
 */
export function buildTools({ userId, tripId, base }: ToolContext): ToolSet {
  return {
    // ---- Read tools (auto-run) ----
    getTripContext: tool({
      description: 'Get the current trip: dates, base location, existing explore items, planned days.',
      inputSchema: noArgsSchema,
      execute: () => handlers.getTripContext(userId, tripId),
    }),
    getWeather: tool({
      description: 'Get the weather forecast for the trip base location (up to 16 days).',
      inputSchema: weatherArgsSchema,
      execute: (input) => handlers.getWeather(userId, tripId, input.days ?? 7),
    }),
    searchPlaces: tool({
      description:
        'Look up real places by name/description to get coordinates before adding them. Set nearBase to bias results around the trip base.',
      inputSchema: z.object({ query: z.string().min(2), nearBase: z.boolean().default(true) }),
      execute: ({ query, nearBase }) => handlers.searchPlaces(query, nearBase, base),
    }),

    // ---- Write tools (require approval) ----
    addExploreItem: tool({
      description: 'Add a single place to the trip’s Explore list.',
      inputSchema: exploreItemInput,
      needsApproval: true,
      execute: (input) => handlers.addExploreItem(userId, tripId, normalizeItem(input)),
    }),
    addExploreItems: tool({
      // Cap is enforced server-side (handler slices); not as schema maxItems, which would make
      // the provider hard-reject the whole call when the model proposes a few extra.
      description: `Add several places to Explore at once (e.g. "find 5 cafés"). Up to ${aiLimits.maxBatchSize} at a time.`,
      inputSchema: z.object({ items: z.array(exploreItemInput).min(1) }),
      needsApproval: true,
      execute: ({ items }) => handlers.addExploreItems(userId, tripId, items.map(normalizeItem)),
    }),
    updateExploreItem: tool({
      description: 'Edit fields of an existing Explore item by id.',
      inputSchema: z.object({ id: z.string(), patch: exploreItemInput.partial() }),
      needsApproval: true,
      execute: ({ id, patch }) => handlers.updateExploreItem(userId, tripId, id, normalizePatch(patch)),
    }),
    toggleFavorite: tool({
      description: 'Mark an Explore item as favorite or not.',
      inputSchema: z.object({ id: z.string(), isFavorite: z.boolean() }),
      needsApproval: true,
      execute: ({ id, isFavorite }) => handlers.toggleFavorite(userId, tripId, id, isFavorite),
    }),
    addToCalendar: tool({
      description: 'Place an Explore item (or a free note) on a specific day of the trip.',
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        exploreItemId: z.string().optional(),
        note: z.string().max(280).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        durationMinutes: z.number().int().min(0).max(1440).optional(),
      }),
      needsApproval: true,
      execute: (input) => handlers.addToCalendar(userId, tripId, input),
    }),
    addPackingItem: tool({
      description: 'Add an item to the packing list under a category/group.',
      inputSchema: z.object({
        category: z.string().min(1).max(80),
        label: z.string().min(1).max(160),
        quantityHint: z.string().max(80).optional(),
      }),
      needsApproval: true,
      execute: (input) => handlers.addPackingItem(userId, tripId, input),
      // Cache breakpoint on the LAST tool: on Anthropic this caches the whole tool-schema prefix
      // (re-sent on every agentic step) at ~10% of the input price. Other providers ignore the
      // `anthropic` namespace. Keep this on whichever tool is defined last.
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    }),
  };
}
