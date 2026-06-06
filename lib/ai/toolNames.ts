/** Tool names that mutate data (client-safe — no server-only imports). */
export const writeToolNames = new Set<string>([
  'addExploreItem',
  'addExploreItems',
  'updateExploreItem',
  'toggleFavorite',
  'addToCalendar',
  'addPackingItem',
]);
