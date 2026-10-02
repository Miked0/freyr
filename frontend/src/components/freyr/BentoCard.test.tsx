import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BentoCard } from './BentoCard';

describe('BentoCard', () => {
  it('renders a section with span, id, title and action', () => {
    const { container } = render(
      <BentoCard span={7} id="transacoes" className="x" title="Transações recentes" action={<a href="#">Ver extrato</a>}>
        corpo
      </BentoCard>,
    );
    const section = container.querySelector('section')!;
    expect(section).toHaveClass('fr-card', 'fr-span-7', 'x');
    expect(section).toHaveAttribute('id', 'transacoes');
    expect(screen.getByRole('heading', { level: 2, name: 'Transações recentes' })).toHaveClass('fr-card-title');
    expect(section.querySelector('header.fr-card-head')).toContainElement(screen.getByRole('link', { name: 'Ver extrato' }));
    expect(section).toHaveTextContent('corpo');
  });

  it('omits the header when there is no title or action', () => {
    const { container } = render(<BentoCard>só corpo</BentoCard>);
    expect(container.querySelector('header')).toBeNull();
    expect((container.firstChild as Element).className).toBe('fr-card');
  });
});
