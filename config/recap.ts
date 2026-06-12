/** The sections a trip recap / PDF can include, in their default order. Plain data so both the
 *  server aggregator and the client (recap view + PDF) can share it. */
export const RECAP_SECTIONS = [
  { key: 'forecast', label: 'Weather', hint: 'The weather across the trip' },
  { key: 'plan', label: 'Day by day', hint: 'Your itinerary, day by day' },
  { key: 'photos', label: 'Photos', hint: 'Your trip photos' },
  { key: 'map', label: 'Map', hint: 'Where you went' },
  { key: 'items', label: 'Places', hint: 'Every place in your field guide' },
  { key: 'roadtrips', label: 'Roadtrips', hint: 'Routes and their stops' },
  { key: 'budget', label: 'Spendings', hint: 'Totals by category and phase' },
] as const;

export type RecapSectionKey = (typeof RECAP_SECTIONS)[number]['key'];

export const RECAP_SECTION_LABEL: Record<RecapSectionKey, string> = Object.fromEntries(
  RECAP_SECTIONS.map((s) => [s.key, s.label]),
) as Record<RecapSectionKey, string>;

export const DEFAULT_RECAP_ORDER: RecapSectionKey[] = RECAP_SECTIONS.map((s) => s.key);
