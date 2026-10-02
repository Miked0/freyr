import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00'));
    useExpenses.setState({ expenses: [], categories: [], status: 'ready', error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('shows the income and spending of the last 30 days, treating less spending as good news', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);
    const income = card('Entradas');
    expect(income).toHaveTextContent('Últimos 30 dias');
    expect(card('Saídas')).toHaveTextContent('Últimos 30 dias');
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

  it('counts income from the start of the window even when it fell in the previous month', () => {
    vi.setSystemTime(new Date('2026-10-02T12:00:00'));
    useExpenses.setState({ expenses: [...rows, { id: 'e', date: '2026-10-01', amount: 93, description: 'Padaria', category: 'Alimentação', type: 'expense' }] });
    render(<OverviewCards />);

    expect(text(card('Entradas').querySelector('.fr-sum-value'))).toBe('R$ 6.000,00');
    expect(text(card('Saídas').querySelector('.fr-sum-value'))).toBe('R$ 2.793,00');
  });

  it('shows a picked month with its name', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards period="2026-08" />);

    expect(card('Entradas')).toHaveTextContent('Agosto 2026');
    expect(text(card('Entradas').querySelector('.fr-sum-value'))).toBe('R$ 5.000,00');
  });

  it('says where the window ends when nothing happened in the last 30 days', () => {
    vi.setSystemTime(new Date('2026-12-20T12:00:00'));
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);

    expect(card('Entradas')).toHaveTextContent('30 dias até 10/09');
  });

  it('shows zeroed cards without deltas when there is no data', () => {
    const { container } = render(<OverviewCards />);
    const values = [...container.querySelectorAll('.fr-sum-value')].map(text);
    expect(values).toEqual(['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
    expect(container.querySelector('.fr-chip')).toBeNull();
  });
});
