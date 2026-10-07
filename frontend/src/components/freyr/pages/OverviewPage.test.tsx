import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewPage } from './OverviewPage';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';
import * as download from '@/lib/download';
import { useGoals } from '@/store/goals';

const rows: Expense[] = [
  { id: 'a', date: '2026-08-10', amount: 500, description: 'Mercado', category: 'Alimentação', type: 'expense' },
  { id: 'b', date: '2026-09-20', amount: 750, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'c', date: '2026-09-05', amount: 8400, description: 'Salário', category: 'Salário', type: 'income' },
];

describe('OverviewPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-25T12:00:00'));
    useExpenses.setState({ expenses: rows, categories: [], status: 'ready', error: null });
    useGoals.setState({ goals: [], status: 'ready' });
  });

  it('lays out the overview panel without the full transaction list', () => {
    render(<OverviewPage />);
    expect(screen.getByText('Visão geral', { selector: 'b' }).parentElement).toHaveTextContent('Finanças / Visão geral');
    expect(screen.getByRole('heading', { level: 1, name: 'Seu dinheiro hoje' })).toBeInTheDocument();
    expect(screen.getByText('Nos últimos 30 dias sobrou dinheiro. Boa colheita.')).toBeInTheDocument();
    const period = screen.getByRole('combobox', { name: 'Período' });
    expect(period).toHaveValue('30d');
    expect([...period.querySelectorAll('option')].map(o => o.textContent)).toEqual(['Últimos 30 dias', 'Setembro 2026', 'Agosto 2026']);
    const titles = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(titles).toEqual(['Fluxo de caixa', 'Novo extrato', 'Metas', 'Transações recentes', 'Para onde foi']);
  });

  it('keeps the import box and drops the header import button', () => {
    render(<OverviewPage />);
    expect(document.getElementById('importar')).toHaveTextContent('Novo extrato');
    expect(screen.queryByRole('button', { name: 'Novo extrato' })).not.toBeInTheDocument();
  });

  it('points "Ver extrato" and the summary links to the transactions page', () => {
    render(<OverviewPage />);
    for (const name of ['Ver extrato', 'Ver transações', 'Ver entradas', 'Ver saídas']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', expect.stringMatching(/^#\/?transacoes$/));
    }
  });

  it('exports every entry as CSV', () => {
    const spy = vi.spyOn(download, 'downloadText').mockImplementation(() => {});
    render(<OverviewPage />);
    fireEvent.click(screen.getByRole('button', { name: /^exportar$/i }));
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/^freyr-.*\.csv$/), expect.stringContaining('Aluguel'), 'text/csv;charset=utf-8');
  });

  it('shows the month picked in the header on the summary cards', () => {
    render(<OverviewPage />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Período' }), { target: { value: '2026-08' } });
    const spending = screen.getByRole('heading', { level: 3, name: 'Saídas' }).closest('section')!;
    expect(spending.querySelector('.fr-sum-value')?.textContent?.replace(/\s/g, ' ')).toBe('R$ 500,00');
    expect(screen.getByText('Agosto saiu mais do que entrou. Dá para virar esse jogo.')).toBeInTheDocument();
  });
});
