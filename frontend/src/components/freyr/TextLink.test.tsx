import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextLink } from './TextLink';

describe('TextLink', () => {
  it('is an anchor when it has an href', () => {
    render(<TextLink href="#transacoes">Ver extrato</TextLink>);
    expect(screen.getByRole('link', { name: 'Ver extrato' })).toHaveClass('fr-link');
  });

  it('is a button without an href', () => {
    render(<TextLink className="x">Todas</TextLink>);
    const btn = screen.getByRole('button', { name: 'Todas' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('fr-link', 'x');
  });
});
