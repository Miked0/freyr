import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalPage } from './LegalPage';

describe('LegalPage', () => {
  it('shows the document with links to the others and back to the app', () => {
    render(<LegalPage doc="privacidade" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '#/termos');
    expect(screen.getByRole('link', { name: 'Seus direitos (LGPD)' })).toHaveAttribute('href', '#/lgpd');
    expect(screen.getByRole('link', { name: /voltar ao freyr/i })).toHaveAttribute('href', '#/');
  });
});
