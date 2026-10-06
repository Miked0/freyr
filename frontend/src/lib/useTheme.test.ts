import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avatarStyle } from './useProfile';
import { resetTheme, useTheme } from './useTheme';

const root = document.documentElement;

function stubMotion({ reduce = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }));
}

describe('theme switch transition', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMotion();
    resetTheme();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    // @ts-expect-error test cleanup of the optional browser API
    delete document.startViewTransition;
    root.classList.remove('is-theme-fading');
    root.style.removeProperty('--fr-theme-x');
    root.style.removeProperty('--fr-theme-y');
    root.style.removeProperty('--fr-theme-r');
  });

  it('reveals the new theme from the toggle with a view transition when the browser has one', () => {
    const startViewTransition = vi.fn((update: () => void) => { update(); return {}; });
    Object.assign(document, { startViewTransition });

    useTheme.getState().toggle({ x: 40, y: 700 });

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root.style.getPropertyValue('--fr-theme-x')).toBe('40px');
    expect(root.style.getPropertyValue('--fr-theme-y')).toBe('700px');
    // Far enough to cover the farthest corner of the 1024×768 jsdom window.
    expect(parseFloat(root.style.getPropertyValue('--fr-theme-r'))).toBeGreaterThanOrEqual(Math.hypot(1024 - 40, 700));
  });

  it('cross-fades the colors when there is no view transition', () => {
    vi.useFakeTimers();
    useTheme.getState().toggle();

    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root).toHaveClass('is-theme-fading');
    vi.runAllTimers();
    expect(root).not.toHaveClass('is-theme-fading');
  });

  it('switches at once when the person asks for reduced motion', () => {
    stubMotion({ reduce: true });
    const startViewTransition = vi.fn();
    Object.assign(document, { startViewTransition });

    useTheme.getState().toggle({ x: 1, y: 1 });

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(root).not.toHaveClass('is-theme-fading');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });
});

describe('avatar initials', () => {
  it('stay dark on the light frost and harvest colors in both themes', () => {
    expect(avatarStyle('frost').color).toBe('var(--on-warm)');
    expect(avatarStyle('brand-warm').color).toBe('var(--on-warm)');
  });
});
