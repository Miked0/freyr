import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CashFlowCard } from './CashFlowCard';
import { useExpenses } from '@/store/expenses';
import type { Expense } from '@/lib/finance';

let seq = 0;
const e = (date: string, amount: number, type: Expense['type'] = 'expense'): Expense =>
  ({ id: `r${++seq}`, date, amount, description: 'x', category: 'Outros', type });

const rows = [
  e('2025-11-05', 4000, 'income'),
  e('2025-11-10', 1000),
  e('2026-08-05', 5000, 'income'),
  e('2026-08-10', 3000),
  e('2026-09-05', 6000, 'income'),
  e('2026-09-10', 8000),
];

const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s/g, ' ');
// The chart tooltip repeats the series names, so the totals are the labels outside the figure.
const total = (name: string) =>
  screen.getAllByText(name, { selector: 'small' }).find(el => !el.closest('figure'))!.nextElementSibling!;

describe('CashFlowCard', () => {
  beforeEach(() => {
    useExpenses.setState({ expenses: rows, categories: [], status: 'ready', error: null });
  });

  it('renders a span-8 card titled "Fluxo de caixa" with the monthly view selected', () => {
    const { container } = render(<CashFlowCard />);
    expect(container.firstChild).toHaveClass('fr-card', 'fr-span-8');
    expect(screen.getByRole('heading', { level: 2, name: 'Fluxo de caixa' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('figure.fr-cf')).toHaveClass('is-all');
    expect(container.querySelector('.fr-cf-plot')).toHaveStyle({ height: '370px' });
  });

  it('totals the months on screen and signs the leftover', () => {
    render(<CashFlowCard />);
    expect(text(total('Entradas'))).toBe('R$ 15.000,00');
    expect(text(total('Saídas'))).toBe('R$ 12.000,00');
    expect(text(total('Sobra'))).toBe('+ R$ 3.000,00');
    expect(total('Sobra').className).toMatch(/positive/);
  });

  it('selects the latest month by default', () => {
    render(<CashFlowCard />);
    expect(screen.getAllByRole('option').map(o => o.querySelector('.fr-cf-x')!.textContent)).toEqual(['Nov', 'Ago', 'Set']);
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Set');
  });

  it('switches to the yearly view and selects the latest year', () => {
    render(<CashFlowCard />);
    fireEvent.click(screen.getByRole('radio', { name: 'Anual' }));
    expect(screen.getByRole('radio', { name: 'Anual' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('option').map(o => o.querySelector('.fr-cf-x')!.textContent)).toEqual(['2025', '2026']);
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('2026');
  });

  it('marks a negative leftover as an alert', () => {
    useExpenses.setState({ expenses: [e('2026-09-01', 100, 'income'), e('2026-09-02', 400)] });
    render(<CashFlowCard />);
    expect(text(total('Sobra'))).toBe('− R$ 300,00');
    expect(total('Sobra').className).toMatch(/alert/);
  });

  it('shows a short note instead of the chart when there is no data', () => {
    useExpenses.setState({ expenses: [] });
    const { container } = render(<CashFlowCard />);
    expect(container.querySelector('figure')).toBeNull();
    expect(screen.getByText(/importe um extrato/i)).toBeInTheDocument();
  });
});
