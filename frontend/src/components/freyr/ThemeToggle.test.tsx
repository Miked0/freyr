import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { resetTheme } from '@/lib/useTheme';
import { ThemeToggle } from './ThemeToggle';

function osPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const root = document.documentElement;

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    root.removeAttribute('data-theme');
    osPrefersDark(false);
    resetTheme();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('is a switch screen readers can name', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('Cenário 1: switches from the default light theme to dark', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(root).toHaveAttribute('data-theme', 'light');

    fireEvent.click(toggle);

    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveAttribute('title', 'Usar tema claro');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('Cenário 2: switches from dark back to light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    resetTheme();
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: 'Tema escuro' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);

    expect(root).toHaveAttribute('data-theme', 'light');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('title', 'Usar tema escuro');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('Cenário 3: keeps the dark choice after a remount, as on a reload or route change', () => {
    const { unmount } = render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('switch'));
    unmount();

    resetTheme();
    render(<ThemeToggle />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('Cenário 4: starts dark when the system prefers dark and nothing is saved', () => {
    osPrefersDark(true);
    resetTheme();
    render(<ThemeToggle />);

    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('keeps every toggle on screen in step', () => {
    render(<><ThemeToggle /><ThemeToggle /></>);
    const [a, b] = screen.getAllByRole('switch');
    act(() => a.click());
    expect(b).toHaveAttribute('aria-checked', 'true');
  });

  it('changes only the root marker, not the styles of other elements', () => {
    render(<div data-testid="card"><ThemeToggle /></div>);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('card')).not.toHaveAttribute('style');
    expect(screen.getByTestId('card')).not.toHaveAttribute('data-theme');
  });

  it('draws the sun and moon on the track and the morphing orb, all hidden from screen readers', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch');
    expect(toggle.querySelectorAll('svg')).toHaveLength(3);
    toggle.querySelectorAll('svg').forEach(svg => expect(svg).toHaveAttribute('aria-hidden', 'true'));
  });

  it('gives each orb its own crescent mask', () => {
    render(<><ThemeToggle /><ThemeToggle /></>);
    const ids = [...document.querySelectorAll('mask')].map(m => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    document.querySelectorAll('.fr-theme-core').forEach((core, i) => expect(core).toHaveAttribute('mask', `url(#${ids[i]})`));
  });
});
