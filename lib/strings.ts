/**
 * User-facing copy. EN default, structured so a DE locale can be added later without touching
 * components. Components must not hardcode user-facing strings — import from here.
 */
export const strings = {
  appName: 'VoyageOS',
  tagline: 'Plan calmer trips.',

  nav: {
    dashboard: 'Dashboard',
    explore: 'Explore',
    chat: 'Chat',
    plan: 'Plan',
    map: 'Map',
    pack: 'Pack',
    budget: 'Budget',
    checklist: 'Checklist',
    roadtrips: 'Roadtrips',
    docs: 'Docs',
    photos: 'Photos',
    more: 'More',
    settings: 'Settings',
  },

  auth: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    devContinue: 'Continue as dev user',
    google: 'Continue with Google',
    discord: 'Continue with Discord',
    signInPrompt: 'Sign in to plan your trips.',
  },

  trips: {
    newTrip: 'New trip',
    switchTrip: 'Switch trip',
    create: 'Create trip',
    name: 'Trip name',
    destination: 'Destination',
    startDate: 'Start date',
    endDate: 'End date',
    baseLabel: 'Base location',
    none: 'No trips yet',
    countdownToday: 'Today!',
    countdownPast: 'In progress',
  },

  common: {
    add: 'Add',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    loading: 'Loading…',
    empty: 'Nothing here yet.',
  },
} as const;

export type Strings = typeof strings;
