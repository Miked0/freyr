import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { OverviewCards } from './OverviewCards';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

const rows: Expense[] = [
  { id: 'a', date: '2026-08-05', amount: 5000, description: 'Salário', category: 'Salário', type: 'income' },
  { id: 'b', date: '2026-08-10', amount: 3000, description: 'Aluguel', category: 'Moradia', type: 'expense' },
  { id: 'c', date: '2026-09-05', amount: 6000, description: 'Salário', category: 'Salário', type: 'income' },
  { id: 'd', date: '2026-09-10', amount: 2700, description: 'Aluguel', category: 'Moradia', type: 'expense' },
];

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s/g, ' ');

function card(label: string) {
  return screen.getByRole('heading', { level: 3, name: label }).closest('section')!;
}

describe('OverviewCards', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });

  it('renders the three summary cards as siblings for the bento grid', () => {
    useExpenses.setState({ expenses: rows });
    const { container } = render(<OverviewCards />);
    const sections = [...container.children];
    expect(sections).toHaveLength(3);
    sections.forEach(s => expect(s).toHaveClass('fr-sum', 'fr-span-4'));
  });

  it('shows the running balance on the hero card with its change since last month', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);
    const hero = card('Saldo total');
    expect(hero).toHaveClass('is-hero');
    expect(hero).toHaveTextContent('Desde o primeiro extrato');
    expect(text(hero.querySelector('.fr-sum-value'))).toBe('R$ 5.300,00');
    // 2000 at the end of August, 5300 now.
    expect(text(hero.querySelector('.fr-chip'))).toBe('↑ +165%');
    expect(within(hero).getByRole('link', { name: 'Ver transações' })).toHaveAttribute('href', '#transacoes');
  });

  it("shows this month's income and spending, treating less spending as good news", () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);
    const income = card('Entradas');
    expect(income).toHaveTextContent('Este mês');
    expect(text(income.querySelector('.fr-sum-value'))).toBe('R$ 6.000,00');
    expect(income.querySelector('.fr-chip')).toHaveClass('is-good');
    expect(text(income.querySelector('.fr-chip'))).toBe('↑ +20%');
    expect(within(income).getByRole('link', { name: 'Ver entradas' })).toHaveAttribute('href', '#transacoes');

    const spending = card('Saídas');
    expect(text(spending.querySelector('.fr-sum-value'))).toBe('R$ 2.700,00');
    expect(spending.querySelector('.fr-chip')).toHaveClass('is-good');
    expect(text(spending.querySelector('.fr-chip'))).toBe('↓ −10%');
    expect(within(spending).getByRole('link', { name: 'Ver saídas' })).toHaveAttribute('href', '#transacoes');
  });

  it('shows zeroed cards without deltas when there is no data', () => {
    const { container } = render(<OverviewCards />);
    const values = [...container.querySelectorAll('.fr-sum-value')].map(text);
    expect(values).toEqual(['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
    expect(container.querySelector('.fr-chip')).toBeNull();
  });
});
