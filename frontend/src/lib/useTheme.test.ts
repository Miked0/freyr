import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avatarStyle } from './useProfile';
import { resetTheme, useTheme } from './useTheme';

const root = document.documentElement;

describe('theme switch', () => {
  beforeEach(() => {
    localStorage.clear();
    resetTheme();
  });

  afterEach(() => {
    // @ts-expect-error test cleanup of the optional browser API
    delete document.startViewTransition;
  });

  it('only flips the root marker; the colors glide in CSS, with no snapshot of the page', () => {
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });

    useTheme.getState().toggle();

    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});

// The glide: every theme color is a registered <color> custom property, so the root can transition it and every
// element reading the token follows frame by frame.
describe('freyr.css theme glide', () => {
  const css = readFileSync(path.resolve(__dirname, '../styles/freyr.css'), 'utf8');
  const darkBlock = /:root\[data-theme="dark"\] \{([^}]*)\}/.exec(css)?.[1] ?? '';
  const colorTokens = [...darkBlock.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))/g)].map(m => m[1]);
  const rootRule = /\n:root \{([^}]*)\}/.exec(css)?.[1] ?? '';
  const transitioned = /transition:([^;]*);/.exec(rootRule)?.[1] ?? '';

  it('finds the dark colors', () => {
    expect(colorTokens.length).toBeGreaterThan(20);
  });

  it.each(colorTokens)('registers %s as a color', token => {
    const rule = new RegExp(`@property ${token} \\{[^}]*syntax: '<color>'[^}]*\\}`);
    expect(css).toMatch(rule);
  });

  it.each(colorTokens)('transitions %s on the root', token => {
    expect(transitioned).toMatch(new RegExp(`${token}\\b`));
  });

  it('drops the circle reveal', () => {
    expect(css).not.toMatch(/view-transition/);
  });
});

describe('avatar initials', () => {
  it('stay dark on the light frost and harvest colors in both themes', () => {
    expect(avatarStyle('frost').color).toBe('var(--on-warm)');
    expect(avatarStyle('brand-warm').color).toBe('var(--on-warm)');
  });
});
