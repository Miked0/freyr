import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TopCategoriesCard } from './TopCategoriesCard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

const rows: Expense[] = [
  { id: 'a', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'b', date: '2026-09-22', amount: 250, description: 'Mercado', category: 'Alimentação', type: 'expense' },
  { id: 'c', date: '2026-09-23', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

describe('TopCategoriesCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });

  it("ranks the month's spending categories, the largest in alert", () => {
    useExpenses.setState({ expenses: rows });
    const { container } = render(<TopCategoriesCard />);

    expect(screen.getByRole('heading', { name: 'Maiores gastos' })).toBeInTheDocument();
    const bars = container.querySelectorAll('.fr-bar');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveTextContent('Moradia');
    expect(bars[0].querySelector('.fr-bar-fill')).toHaveClass('is-alert');
    expect(container).not.toHaveTextContent('Salário');
  });

  it('says so when the month has no spending', () => {
    render(<TopCategoriesCard />);
    expect(screen.getByText(/nenhum gasto/i)).toBeInTheDocument();
  });
});
