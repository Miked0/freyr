import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

const plain = (s: string | null) => (s ?? '').replace(/ /g, ' ');
const rows: Expense[] = [
  { id: 'a', date: '2026-09-20', amount: 2150, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'b', date: '2026-09-24', amount: 284.9, description: 'Mercado Central', category: 'Alimentação', type: 'expense' },
  { id: 'c', date: '2026-09-22', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

describe('RecentTransactionsCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });

  it('lists the latest entries, signed, with a link to the full statement', () => {
    useExpenses.setState({ expenses: rows });
    const { container } = render(<RecentTransactionsCard />);

    expect(container.querySelector('section')).toHaveClass('fr-card', 'fr-span-7');
    expect(screen.getByRole('heading', { name: 'Transações recentes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver extrato' })).toHaveAttribute('href', '#transacoes');
    const names = Array.from(container.querySelectorAll('.fr-tx-name')).map(n => n.textContent);
    expect(names).toEqual(['Mercado Central', 'Salário', 'Aluguel']);
    const salary = screen.getByText('Salário', { selector: '.fr-tx-name' }).closest('li')!;
    expect(plain(salary.textContent)).toContain('+ R$ 8.400,00');
    expect(salary).toHaveTextContent('[ Receita ]');
  });

  it('says so when there is nothing yet', () => {
    const { container } = render(<RecentTransactionsCard />);

    expect(container.querySelector('.fr-tx')).toBeNull();
    expect(screen.getByText(/nenhum lançamento/i)).toBeInTheDocument();
  });
});
