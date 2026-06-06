import { describe, it, expect } from 'vitest';
import { themeToCssVars, themeRootCss } from './css';
import { theme } from '@/config/theme';

describe('theme css generation', () => {
  it('maps theme tokens to --vos-* custom properties', () => {
    const vars = themeToCssVars();
    expect(vars['--vos-color-primary']).toBe(theme.colors.primary);
    expect(vars['--vos-color-accent2']).toBe(theme.colors.accent2);
    expect(vars['--vos-radius-md']).toBe(theme.radius.md);
    expect(vars['--vos-shadow-card']).toBe(theme.shadow.card);
  });

  it('serializes a :root block containing the tokens', () => {
    const css = themeRootCss();
    expect(css.startsWith(':root{')).toBe(true);
    expect(css).toContain(`--vos-color-primary:${theme.colors.primary};`);
  });
});
