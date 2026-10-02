import { percentChange, totalsByMonth, type Expense } from './finance';

export interface OverviewSummary {
  /** The latest month with entries, as "YYYY-MM". */
  monthKey: string;
  /** Running balance of every entry (income minus spending). */
  balance: number;
  /** Change of the running balance against the end of the previous month with entries. */
  balanceDelta?: number;
  income: number;
  incomeDelta?: number;
  expense: number;
  expenseDelta?: number;
}

export interface CashFlowPoint {
  label: string;
  income: number;
  expense: number;
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Summary of `monthKey` ("YYYY-MM"), or of the latest month with entries when it is omitted or has none. */
export function summarizeOverview(expenses: Expense[], monthKey?: string): OverviewSummary | null {
  const all = totalsByMonth(expenses);
  const index = all.findIndex(m => m.key === monthKey);
  const months = index === -1 ? all : all.slice(0, index + 1);
  const current = months.at(-1);
  if (!current) return null;
  const previous = months.at(-2);
  const balance = months.reduce((sum, m) => sum + m.balance, 0);

  return {
    monthKey: current.key,
    balance,
    balanceDelta: previous ? percentChange(balance, balance - current.balance) : undefined,
    income: current.income,
    incomeDelta: previous ? percentChange(current.income, previous.income) : undefined,
    expense: current.expense,
    expenseDelta: previous ? percentChange(current.expense, previous.expense) : undefined,
  };
}

export function cashFlowSeries(expenses: Expense[], view: 'monthly' | 'yearly'): CashFlowPoint[] {
  const months = totalsByMonth(expenses);
  if (view === 'monthly') {
    return months.slice(-12).map(m => ({
      label: MONTH_LABELS[Number(m.key.slice(5, 7)) - 1],
      income: m.income,
      expense: m.expense,
    }));
  }
  const byYear = new Map<string, CashFlowPoint>();
  for (const m of months) {
    const label = m.key.slice(0, 4);
    const year = byYear.get(label) ?? { label, income: 0, expense: 0 };
    year.income += m.income;
    year.expense += m.expense;
    byYear.set(label, year);
  }
  return [...byYear.values()];
}
