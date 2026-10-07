import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from '@/lib/useTheme';
import { AppearanceCard } from './AppearanceCard';

describe('AppearanceCard', () => {
  beforeEach(() => {
    useTheme.getState().set('light');
  });

  it('switches to the dark theme and keeps the choice', () => {
    render(<AppearanceCard />);
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: /fiorde/i }));

    expect(useTheme.getState().theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('freyr:theme')).toBe('dark');
  });
});
