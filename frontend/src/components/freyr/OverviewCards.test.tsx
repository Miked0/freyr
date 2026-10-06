import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewCards } from './OverviewCards';
import { useExpenses } from '@/store/expenses';
import { setLoadedProfile } from '@/lib/useProfile';
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

  it('leads with what was left of the period, comparing spending with income', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);
    const hero = card('Sobrou');
    expect(hero).toHaveClass('is-hero');
    expect(hero).toHaveTextContent('Últimos 30 dias');
    expect(text(hero.querySelector('.fr-sum-value'))).toBe('R$ 3.300,00');
    expect(within(hero).getByRole('img', { name: 'Saiu 45% do que entrou' })).toBeInTheDocument();
    expect(text(hero)).toContain('Entrou R$ 6.000,00');
    expect(text(hero)).toContain('Saiu R$ 2.700,00');
    expect(within(hero).getByRole('link', { name: 'Ver entradas' })).toHaveAttribute('href', '#transacoes');
  });

  it('says what was missing when spending passed income', () => {
    useExpenses.setState({ expenses: [...rows, { id: 'e', date: '2026-09-12', amount: 4000, description: 'Notebook', category: 'Compras', type: 'expense' }] });
    render(<OverviewCards />);
    const hero = card('Faltou');
    expect(text(hero.querySelector('.fr-sum-value'))).toBe('R$ 700,00');
    expect(within(hero).getByRole('img', { name: 'Saiu 112% do que entrou' })).toBeInTheDocument();
  });

  it('shows the running balance split into available and invested money', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);
    const balance = card('Saldo total');
    expect(balance).toHaveTextContent('Desde o primeiro extrato');
    expect(text(balance.querySelector('.fr-sum-value'))).toBe('R$ 5.300,00');
    // 2000 at the end of August, 5300 now.
    expect(text(balance.querySelector('.fr-chip'))).toBe('↑ +165%');
    expect(text(balance)).toContain('Disponível R$ 5.300,00');
    expect(text(balance)).toContain('Investido R$ 0,00');
    expect(within(balance).getByRole('link', { name: 'Ver transações' })).toHaveAttribute('href', '#transacoes');
  });

  it('splits the spending of the period into fixed bills and day-to-day, treating less spending as good news', () => {
    useExpenses.setState({ expenses: [...rows, { id: 'e', date: '2026-09-12', amount: 300, description: 'Mercado', category: 'Mercado', type: 'expense' }] });
    render(<OverviewCards />);
    const spending = card('Saídas');
    expect(spending).toHaveTextContent('Últimos 30 dias');
    expect(text(spending.querySelector('.fr-sum-value'))).toBe('R$ 3.000,00');
    expect(spending.querySelector('.fr-chip')).toHaveClass('is-good');
    expect(text(spending)).toContain('Fixas R$ 2.700,00');
    expect(text(spending)).toContain('Dia a dia R$ 300,00');
    expect(within(spending).getByRole('link', { name: 'Ver saídas' })).toHaveAttribute('href', '#transacoes');
  });

  it('counts income from the start of the window even when it fell in the previous month', () => {
    vi.setSystemTime(new Date('2026-10-02T12:00:00'));
    useExpenses.setState({ expenses: [...rows, { id: 'e', date: '2026-10-01', amount: 93, description: 'Padaria', category: 'Alimentação', type: 'expense' }] });
    render(<OverviewCards />);

    expect(text(card('Sobrou'))).toContain('Entrou R$ 6.000,00');
    expect(text(card('Saídas').querySelector('.fr-sum-value'))).toBe('R$ 2.793,00');
  });

  it('shows a picked month with its name', () => {
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards period="2026-08" />);

    expect(card('Sobrou')).toHaveTextContent('Agosto 2026');
    expect(text(card('Sobrou').querySelector('.fr-sum-value'))).toBe('R$ 2.000,00');
  });

  it('says where the window ends when nothing happened in the last 30 days', () => {
    vi.setSystemTime(new Date('2026-12-20T12:00:00'));
    useExpenses.setState({ expenses: rows });
    render(<OverviewCards />);

    expect(card('Saídas')).toHaveTextContent('30 dias até 10/09');
  });

  it('shows zeroed cards without deltas when there is no data', () => {
    const { container } = render(<OverviewCards />);
    const values = [...container.querySelectorAll('.fr-sum-value')].map(text);
    expect(values).toEqual(['R$ 0,00', 'R$ 0,00', 'R$ 0,00']);
    expect(container.querySelector('.fr-chip')).toBeNull();
  });
});

describe('OverviewCards with investments', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps invested money in the balance, as its own part, and out of spending', () => {
    useExpenses.setState({
      expenses: [
        ...rows,
        { id: 'e', date: '2026-09-12', amount: 750, description: 'Aplicação CDB', category: 'Investimentos', type: 'expense' },
      ],
    });
    render(<OverviewCards />);

    expect(text(card('Saldo total').querySelector('.fr-sum-value'))).toBe('R$ 5.300,00');
    expect(text(card('Saldo total'))).toContain('Disponível R$ 4.550,00');
    expect(text(card('Saldo total'))).toContain('Investido R$ 750,00');
    expect(text(card('Saídas'))).not.toContain('750');
  });
});

describe('OverviewCards with the invested amount the user told', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00'));
    useExpenses.setState({ expenses: rows });
  });

  afterEach(() => {
    vi.useRealTimers();
    setLoadedProfile(null);
  });

  it('adds it to the balance as invested money', () => {
    setLoadedProfile({ username: 'mike', display_name: null, avatar_color: 'hero', monthly_budget: null, invested_balance: 3000, invested_balance_on: '2026-09-15' });
    render(<OverviewCards />);

    const balance = card('Saldo total');
    expect(text(balance.querySelector('.fr-sum-value'))).toBe('R$ 8.300,00');
    expect(text(balance)).toContain('Disponível R$ 5.300,00');
    expect(text(balance)).toContain('Investido R$ 3.000,00');
    expect(within(balance).queryByRole('link', { name: /informe quanto/i })).toBeNull();
  });

  it('asks for it in the profile when the user has not told it', () => {
    render(<OverviewCards />);

    expect(within(card('Saldo total')).getByRole('link', { name: 'Informe quanto você tem investido' })).toHaveAttribute('href', '#/perfil');
  });
});
