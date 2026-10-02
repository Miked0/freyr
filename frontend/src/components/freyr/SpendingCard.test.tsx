import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SpendingCard } from './SpendingCard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

const rows: Expense[] = [
  { id: 'a', date: '2026-08-20', amount: 999, description: 'Antigo', category: 'Lazer', type: 'expense' },
  { id: 'b', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'c', date: '2026-09-22', amount: 250, description: 'Mercado', category: 'Alimentação', type: 'expense' },
  { id: 'd', date: '2026-09-23', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

describe('SpendingCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });

  it("splits the latest month's spending in a donut labelled Saídas", () => {
    useExpenses.setState({ expenses: rows });
    const { container } = render(<SpendingCard id="categorias" />);

    const section = container.querySelector('section')!;
    expect(section).toHaveClass('fr-card', 'fr-span-5');
    expect(section).toHaveAttribute('id', 'categorias');
    expect(screen.getByRole('heading', { name: 'Para onde foi' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Moradia 75%, Alimentação 25%/ })).toBeInTheDocument();
    expect(container.querySelector('.fr-donut-center')).toHaveTextContent('[ Saídas ]');
  });

  it('says so when there is no spending yet', () => {
    const { container } = render(<SpendingCard />);

    expect(container.querySelector('.fr-donut')).toBeNull();
    expect(screen.getByText(/nenhum gasto/i)).toBeInTheDocument();
  });
});
