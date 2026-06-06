import { theme } from '@/config/theme';

/**
 * Flattens the typed theme object into CSS custom properties under the `--vos-*` namespace.
 * These are injected on `:root` by the root layout, and mapped into Tailwind's token
 * namespaces in `app/globals.css` via `@theme inline`.
 *
 * Naming: `colors.accent2` -> `--vos-color-accent2`, `radius.md` -> `--vos-radius-md`, etc.
 */
function toKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function themeToCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  const groups: Record<string, Record<string, string>> = {
    color: theme.colors,
    radius: theme.radius,
    font: theme.font,
    shadow: theme.shadow,
    space: theme.spacing,
  };

  for (const [group, entries] of Object.entries(groups)) {
    for (const [key, val] of Object.entries(entries)) {
      vars[`--vos-${group}-${toKebab(key)}`] = val;
    }
  }
  return vars;
}

/** Serializes the theme vars into a `:root { ... }` CSS string for inline injection. */
export function themeRootCss(): string {
  const vars = themeToCssVars();
  const body = Object.entries(vars)
    .map(([name, value]) => `${name}:${value};`)
    .join('');
  return `:root{${body}}`;
}
