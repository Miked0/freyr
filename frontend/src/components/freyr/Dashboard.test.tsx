import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';
import * as download from '@/lib/download';

const rows: Expense[] = [
  { id: 'a', date: '2026-08-10', amount: 500, description: 'Mercado', category: 'Alimentação', type: 'expense' },
  { id: 'b', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'c', date: '2026-09-05', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

const online = { state: 'online', health: { status: 'OK', ai: 'keywords' } } as const;

describe('Dashboard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: rows, categories: [], status: 'ready', error: null });
  });

  it('lays out the overview panel in the design-system order', async () => {
    render(<Dashboard health={online} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Visão geral financeira' })).toBeInTheDocument();
    expect(screen.getByText('Setembro rendeu mais do que saiu. Boa colheita.')).toBeInTheDocument();
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(titles).toEqual([
      'Fluxo de caixa', 'Importar extrato', 'Maiores gastos', 'Transações recentes', 'Para onde foi', 'Todas as transações',
    ]);
    expect(document.getElementById('categorias')).toHaveTextContent('Para onde foi');
    expect(await screen.findByRole('navigation', { name: 'Principal' })).toHaveTextContent('Transações3');
  });

  it('exports every entry as CSV', () => {
    const spy = vi.spyOn(download, 'downloadText').mockImplementation(() => {});
    render(<Dashboard health={online} />);

    fireEvent.click(screen.getByRole('button', { name: /exportar/i }));

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^freyr-.*\.csv$/), expect.stringContaining('Aluguel'), 'text/csv;charset=utf-8');
  });
});
