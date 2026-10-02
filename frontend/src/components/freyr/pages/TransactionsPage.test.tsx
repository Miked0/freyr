import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsPage } from './TransactionsPage';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';
import * as download from '@/lib/download';

const rows: Expense[] = [
  { id: 'a', date: '2026-09-10', amount: 500, description: 'Mercado do bairro', category: 'Alimentação', type: 'expense' },
  { id: 'b', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
];

describe('TransactionsPage', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: rows, categories: [], status: 'ready', error: null });
  });

  it('shows the full list in a full-width card', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transações', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Transações');
    expect(screen.getByRole('heading', { level: 1, name: 'Todas as transações' })).toBeInTheDocument();
    const card = screen.getByText('Mercado do bairro').closest('section');
    expect(card).toHaveClass('fr-card', 'fr-span-12');
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
  });

  it('exports every entry as CSV', () => {
    const spy = vi.spyOn(download, 'downloadText').mockImplementation(() => {});
    render(<TransactionsPage />);
    fireEvent.click(screen.getByRole('button', { name: /^exportar$/i }));
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^freyr-.*\.csv$/), expect.stringContaining('Aluguel'), 'text/csv;charset=utf-8');
  });
});
