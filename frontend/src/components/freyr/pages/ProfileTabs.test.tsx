import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileTabs } from './ProfileTabs';

describe('ProfileTabs', () => {
  it('links the profile and its settings, marking the open one', () => {
    render(<ProfileTabs current="settings" />);

    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '#/perfil');
    const settings = screen.getByRole('link', { name: 'Configurações' });
    expect(settings).toHaveAttribute('href', '#/perfil/configuracoes');
    expect(settings).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current');
  });
});
