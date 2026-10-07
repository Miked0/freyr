import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImportCard } from './ImportCard';

describe('ImportCard', () => {
  it('wraps the statement dropzone in a card anchored at #importar', () => {
    const { container } = render(<ImportCard />);

    const section = container.querySelector('section')!;
    expect(section).toHaveClass('fr-card');
    expect(section).toHaveAttribute('id', 'importar');
    expect(screen.getByRole('heading', { name: 'Novo extrato' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /envio de extrato/i })).toBeInTheDocument();
  });
});
