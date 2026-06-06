/**
 * VoyageOS design tokens — the single source of truth for the whole app's look.
 *
 * Editing values here restyles the entire app. Components must NOT hardcode colors,
 * fonts, radii, shadows, or spacing — they consume Tailwind tokens that are backed by
 * the CSS custom properties generated from this file (see `lib/theme/css.ts` and
 * `app/globals.css`).
 *
 * Aesthetic: modern, spacious travel app — clean white surfaces on a near-white canvas,
 * a vivid lime accent used as a FILL (with dark `accentFg` text), geometric sans
 * typography, and a monospace for small data labels (coordinates, dates, codes).
 *
 * Note: lime `accent` is light — only use it as a background/fill with `accent-foreground`
 * text. For readable colored text/links use `ink`, `accent-2` (teal), or `success`.
 *
 * Fonts reference `--font-sora` / `--font-jakarta` / `--font-geist-mono`, provided by
 * `next/font` in `app/layout.tsx`. Literal families are fallbacks.
 */
export const theme = {
  colors: {
    bg: '#f4f5f3', // near-white canvas (cool, not beige)
    surface: '#ffffff', // clean white cards
    header: '#17191c', // dark ink (dark surfaces)
    primary: '#17191c', // near-black — brand mark, dark chips, selected states
    primaryFg: '#ffffff',
    accent: '#c6f24e', // lime signature (FILL only)
    accentFg: '#17191c', // dark text on lime
    accent2: '#2f9e9e', // teal (readable as text)
    ink: '#17191c', // near-black text
    muted: '#6b716c', // cool grey
    border: '#e7eae6', // cool light hairline
    success: '#3f9142',
    danger: '#dc4a3d',
    // map group colors — distinct, modern
    mapSwim: '#0ea5b7', // teal
    mapHike: '#6f9e2c', // green
    mapCulture: '#8b5cf6', // violet
    mapFood: '#f97316', // orange
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '18px',
    pill: '999px',
  },
  font: {
    display: 'var(--font-sora), system-ui, sans-serif', // headings / titles
    sans: 'var(--font-jakarta), system-ui, sans-serif', // body / UI
    mono: 'var(--font-geist-mono), ui-monospace, "SFMono-Regular", monospace', // data labels
  },
  shadow: {
    card: '0 1px 2px rgba(20,22,24,.04), 0 6px 18px rgba(20,22,24,.05)',
    lift: '0 4px 12px rgba(20,22,24,.06), 0 14px 32px rgba(20,22,24,.08)',
  },
  spacing: {
    cardGap: '24px',
    sectionGap: '56px',
  },
} as const;

export type Theme = typeof theme;
export type ThemeColors = keyof Theme['colors'];
