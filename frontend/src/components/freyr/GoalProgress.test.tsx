import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoalProgress } from './GoalProgress';

describe('GoalProgress', () => {
  it('shows the name, percentage, bar and amounts with the due date', () => {
    const { container } = render(<GoalProgress label="Reserva de emergência" current={6800} target={10000} due="dez 2026" />);

    expect(screen.getByText('Reserva de emergência')).toHaveClass('fr-goal-name');
    expect(screen.getByText('68%')).toHaveClass('fr-goal-pct');
    const bar = screen.getByRole('progressbar', { name: 'Reserva de emergência' });
    expect(bar).toHaveAttribute('aria-valuenow', '68');
    expect(container.querySelector('.fr-goal-fill')).toHaveStyle({ width: '68%' });
    expect(container.querySelector('.fr-goal-meta')!.textContent).toMatch(/^R\$\s6\.800,00 de R\$\s10\.000,00 · dez 2026$/);
  });

  it('turns positive and says Concluída once the target is reached', () => {
    const { container } = render(<GoalProgress label="Notebook" current={8000} target={7500} />);

    expect(screen.getByText('Concluída')).toHaveClass('fr-goal-pct', 'is-done');
    expect(container.querySelector('.fr-goal-fill')).toHaveClass('is-done');
    expect(container.querySelector('.fr-goal-fill')).toHaveStyle({ width: '100%' });
    expect(container.querySelector('.fr-goal-meta')!.textContent).not.toMatch(/·/);
  });

  it('is only Concluída when the whole target is saved', () => {
    render(<GoalProgress label="Viagem" current={9996} target={10000} />);

    expect(screen.queryByText('Concluída')).not.toBeInTheDocument();
    expect(screen.getByText('99%')).toBeInTheDocument();
  });
});
